import os
import re
import json
import sqlite3
import smtplib
import requests
from pathlib import Path
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional


CONFIG_PATH = Path("config.json")
DB_PATH = Path("hotel_prices.db")


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("config.json 파일이 없습니다.")

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_trip_dates(days_after: int, nights: int) -> tuple[str, str]:
    check_in = date.today() + timedelta(days=days_after)
    check_out = check_in + timedelta(days=nights)
    return check_in.isoformat(), check_out.isoformat()


def extract_price(value: Any) -> Optional[int]:
    """
    SerpAPI Google Hotels 응답의 가격 필드는 문자열 또는 dict 형태일 수 있습니다.
    예: "$123", "₩150,000", {"lowest": "₩150,000"}
    이 함수는 가능한 경우 숫자만 추출합니다.
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return int(value)

    if isinstance(value, dict):
        for key in (
            "extracted_lowest",
            "lowest",
            "extracted_before_taxes_fees",
            "before_taxes_fees",
        ):
            if key in value:
                parsed = extract_price(value[key])
                if parsed is not None:
                    return parsed
        return None

    text = str(value)
    numbers = re.findall(r"\d+", text.replace(",", ""))
    if not numbers:
        return None

    return int("".join(numbers))


def search_hotels_with_serpapi(
    location: str,
    check_in_date: str,
    check_out_date: str,
    adults: int,
    currency: str,
) -> List[Dict[str, Any]]:
    api_key = os.environ["SERPAPI_API_KEY"]

    params = {
        "engine": "google_hotels",
        "q": location,
        "check_in_date": check_in_date,
        "check_out_date": check_out_date,
        "adults": adults,
        "currency": currency,
        "gl": "kr",
        "hl": "ko",
        "api_key": api_key,
    }

    response = requests.get(
        "https://serpapi.com/search.json",
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    if "error" in data:
        raise RuntimeError(f"SerpAPI error: {data['error']}")

    return data.get("properties", [])


def normalize_hotels(raw_hotels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    hotels = []

    for item in raw_hotels:
        rate_per_night = item.get("rate_per_night")
        total_rate = item.get("total_rate")

        price = extract_price(total_rate) or extract_price(rate_per_night)

        hotel = {
            "name": item.get("name", "이름 없음"),
            "price": price,
            "rate_per_night_raw": rate_per_night,
            "total_rate_raw": total_rate,
            "rating": item.get("overall_rating"),
            "reviews": item.get("reviews"),
            "address": item.get("address"),
            "link": item.get("link") or item.get("serpapi_property_details_link"),
            "source": "SerpAPI Google Hotels",
        }

        if hotel["price"] is not None:
            hotels.append(hotel)

    return hotels


def filter_and_sort_hotels(
    hotels: List[Dict[str, Any]],
    top_n: int,
    min_rating: float,
) -> List[Dict[str, Any]]:
    filtered = []

    for hotel in hotels:
        rating = hotel.get("rating")
        if min_rating and rating is not None and float(rating) < float(min_rating):
            continue
        filtered.append(hotel)

    return sorted(filtered, key=lambda h: h["price"])[:top_n]


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hotel_name TEXT NOT NULL,
            location TEXT NOT NULL,
            check_in_date TEXT NOT NULL,
            check_out_date TEXT NOT NULL,
            price INTEGER NOT NULL,
            rating REAL,
            link TEXT,
            checked_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def save_price_history(
    location: str,
    check_in_date: str,
    check_out_date: str,
    hotels: List[Dict[str, Any]],
) -> None:
    init_db()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    checked_at = datetime.now().isoformat(timespec="seconds")

    for hotel in hotels:
        cur.execute("""
            INSERT INTO price_history
            (hotel_name, location, check_in_date, check_out_date, price, rating, link, checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            hotel["name"],
            location,
            check_in_date,
            check_out_date,
            hotel["price"],
            hotel.get("rating"),
            hotel.get("link"),
            checked_at,
        ))

    conn.commit()
    conn.close()


def get_previous_lowest_price(
    location: str,
    check_in_date: str,
    check_out_date: str,
) -> Optional[int]:
    if not DB_PATH.exists():
        return None

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        SELECT MIN(price)
        FROM price_history
        WHERE location = ?
          AND check_in_date = ?
          AND check_out_date = ?
    """, (location, check_in_date, check_out_date))

    value = cur.fetchone()[0]
    conn.close()

    return value


def money(value: Optional[int]) -> str:
    if value is None:
        return "-"
    return f"{value:,}원"


def build_email_html(
    location: str,
    check_in_date: str,
    check_out_date: str,
    hotels: List[Dict[str, Any]],
    previous_lowest: Optional[int],
) -> str:
    rows = ""

    for i, hotel in enumerate(hotels, start=1):
        link_html = "-"
        if hotel.get("link"):
            link_html = f'<a href="{hotel["link"]}">보기</a>'

        rows += f"""
        <tr>
            <td>{i}</td>
            <td>{hotel["name"]}</td>
            <td>{money(hotel["price"])}</td>
            <td>{hotel.get("rating") or "-"}</td>
            <td>{hotel.get("reviews") or "-"}</td>
            <td>{hotel.get("address") or "-"}</td>
            <td>{link_html}</td>
        </tr>
        """

    current_lowest = hotels[0]["price"] if hotels else None

    previous_text = "이전 최저가 기록 없음"
    if previous_lowest is not None:
        previous_text = f"이전 최저가: {money(previous_lowest)}"

    return f"""
    <html>
      <body>
        <h2>호텔 최저가 알림</h2>
        <p><b>지역:</b> {location}</p>
        <p><b>숙박일:</b> {check_in_date} ~ {check_out_date}</p>
        <p><b>현재 최저가:</b> {money(current_lowest)}</p>
        <p><b>{previous_text}</b></p>

        <table border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>순위</th>
              <th>호텔명</th>
              <th>가격</th>
              <th>평점</th>
              <th>리뷰 수</th>
              <th>주소</th>
              <th>링크</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>

        <p style="margin-top:16px;">
          가격은 조회 시점 기준이며, 예약 화면에서 세금·수수료·환율·객실 조건에 따라 달라질 수 있습니다.
        </p>
      </body>
    </html>
    """


def send_email(subject: str, html: str) -> None:
    gmail_user = os.environ["GMAIL_USER"]
    gmail_app_password = os.environ["GMAIL_APP_PASSWORD"]
    to_email = os.environ["TO_EMAIL"]

    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(gmail_user, gmail_app_password)
        smtp.send_message(msg)


def main() -> None:
    config = load_config()

    location = config["location"]
    adults = int(config.get("adults", 2))
    currency = config.get("currency", "KRW")
    days_after = int(config.get("days_after", 14))
    nights = int(config.get("nights", 1))
    top_n = int(config.get("top_n", 5))
    min_rating = float(config.get("min_rating", 0))
    send_only_when_price_drops = bool(config.get("send_only_when_price_drops", False))

    check_in_date, check_out_date = get_trip_dates(days_after, nights)

    previous_lowest = get_previous_lowest_price(
        location,
        check_in_date,
        check_out_date,
    )

    raw_hotels = search_hotels_with_serpapi(
        location=location,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        adults=adults,
        currency=currency,
    )

    hotels = normalize_hotels(raw_hotels)
    cheapest_hotels = filter_and_sort_hotels(
        hotels=hotels,
        top_n=top_n,
        min_rating=min_rating,
    )

    if not cheapest_hotels:
        send_email(
            subject=f"[호텔 알림] {location} 검색 결과 없음",
            html=f"<p>{location} / {check_in_date} ~ {check_out_date} 조건에서 가격 정보를 찾지 못했습니다.</p>",
        )
        return

    current_lowest = cheapest_hotels[0]["price"]

    save_price_history(
        location=location,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        hotels=cheapest_hotels,
    )

    if (
        send_only_when_price_drops
        and previous_lowest is not None
        and current_lowest >= previous_lowest
    ):
        print(
            f"가격 하락 없음. 현재 최저가={current_lowest}, 이전 최저가={previous_lowest}. 이메일 발송 생략."
        )
        return

    html = build_email_html(
        location=location,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        hotels=cheapest_hotels,
        previous_lowest=previous_lowest,
    )

    subject = f"[호텔 최저가] {location} {check_in_date} TOP {len(cheapest_hotels)}"
    send_email(subject, html)
    print("이메일 발송 완료")


if __name__ == "__main__":
    main()
