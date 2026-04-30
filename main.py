import html
import json
import os
import re
import sqlite3
import smtplib
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests


CONFIG_PATH = Path("config.json")
DB_PATH = Path("hotel_prices.db")


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("config.json 파일이 없습니다.")

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def clean_supabase_url(value: str) -> str:
    return value.strip().rstrip("/").removesuffix("/rest/v1")


def has_supabase_config() -> bool:
    return bool(os.environ.get("DATA_URL") and os.environ.get("DATA_KEY"))


def supabase_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    key = os.environ["DATA_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def supabase_url(path: str) -> str:
    base_url = clean_supabase_url(os.environ["DATA_URL"])
    return f"{base_url}/rest/v1/{path.lstrip('/')}"


def load_active_alerts() -> List[Dict[str, Any]]:
    if has_supabase_config():
        response = requests.get(
            supabase_url("hotel_alerts"),
            headers=supabase_headers(),
            params={
                "select": "*",
                "is_active": "eq.true",
                "order": "created_at.asc",
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    config = load_config()
    if isinstance(config.get("users"), list):
        return [
            {
                **user,
                "email": str(user.get("email") or user.get("to_email") or os.environ.get("TO_EMAIL", "")).strip(),
                "is_active": user.get("is_active", True),
            }
            for user in config["users"]
            if user.get("is_active", True)
        ]

    fallback_email = str(config.get("to_email") or os.environ.get("TO_EMAIL", "")).strip()
    return [{**config, "id": None, "email": fallback_email, "is_active": True}]


def get_trip_dates(config: Dict[str, Any]) -> tuple[str, str]:
    if config.get("check_in_date") and config.get("check_out_date"):
        return str(config["check_in_date"]), str(config["check_out_date"])

    days_after = int(config.get("days_after", 14))
    nights = int(config.get("nights", 1))
    check_in = date.today() + timedelta(days=days_after)
    check_out = check_in + timedelta(days=nights)
    return check_in.isoformat(), check_out.isoformat()


def extract_price(value: Any) -> Optional[int]:
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
    children: int,
    children_ages: str,
    currency: str,
) -> List[Dict[str, Any]]:
    api_key = os.environ["SERPAPI_API_KEY"]

    params = {
        "engine": "google_hotels",
        "q": location,
        "check_in_date": check_in_date,
        "check_out_date": check_out_date,
        "adults": adults,
        "children": children,
        "currency": currency,
        "gl": "kr",
        "hl": "ko",
        "api_key": api_key,
    }

    if children > 0 and children_ages:
        params["children_ages"] = children_ages

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
        price = extract_price(item.get("total_rate")) or extract_price(item.get("rate_per_night"))
        if price is None:
            continue

        hotels.append({
            "name": item.get("name", "이름 없음"),
            "price": price,
            "rating": item.get("overall_rating"),
            "reviews": item.get("reviews"),
            "address": item.get("address"),
            "link": item.get("link") or item.get("serpapi_property_details_link"),
            "source": "SerpAPI Google Hotels",
        })

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
    alert_id: Optional[str],
    location: str,
    check_in_date: str,
    check_out_date: str,
    hotels: List[Dict[str, Any]],
) -> None:
    checked_at = datetime.now().isoformat(timespec="seconds")

    if has_supabase_config() and alert_id:
        rows = [
            {
                "alert_id": alert_id,
                "hotel_name": hotel["name"],
                "location": location,
                "check_in_date": check_in_date,
                "check_out_date": check_out_date,
                "price": hotel["price"],
                "rating": hotel.get("rating"),
                "link": hotel.get("link"),
                "checked_at": checked_at,
            }
            for hotel in hotels
        ]
        response = requests.post(
            supabase_url("hotel_price_history"),
            headers=supabase_headers("return=minimal"),
            json=rows,
            timeout=30,
        )
        response.raise_for_status()
        return

    init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

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
    alert_id: Optional[str],
    location: str,
    check_in_date: str,
    check_out_date: str,
) -> Optional[int]:
    if has_supabase_config() and alert_id:
        response = requests.get(
            supabase_url("hotel_price_history"),
            headers=supabase_headers(),
            params={
                "select": "price",
                "alert_id": f"eq.{alert_id}",
                "check_in_date": f"eq.{check_in_date}",
                "check_out_date": f"eq.{check_out_date}",
                "order": "price.asc",
                "limit": "1",
            },
            timeout=30,
        )
        response.raise_for_status()
        rows = response.json()
        return int(rows[0]["price"]) if rows else None

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

    return int(value) if value is not None else None


def money(value: Optional[int], currency: str) -> str:
    if value is None:
        return "-"
    return f"{value:,} {currency}"


def build_email_html(
    location: str,
    check_in_date: str,
    check_out_date: str,
    adults: int,
    children: int,
    children_ages: str,
    currency: str,
    hotels: List[Dict[str, Any]],
    previous_lowest: Optional[int],
) -> str:
    rows = ""

    for i, hotel in enumerate(hotels, start=1):
        link_html = "-"
        if hotel.get("link"):
            safe_link = html.escape(str(hotel["link"]), quote=True)
            link_html = f'<a href="{safe_link}">보기</a>'

        rows += f"""
        <tr>
            <td>{i}</td>
            <td>{html.escape(str(hotel["name"]))}</td>
            <td>{money(hotel["price"], currency)}</td>
            <td>{html.escape(str(hotel.get("rating") or "-"))}</td>
            <td>{html.escape(str(hotel.get("reviews") or "-"))}</td>
            <td>{html.escape(str(hotel.get("address") or "-"))}</td>
            <td>{link_html}</td>
        </tr>
        """

    current_lowest = hotels[0]["price"] if hotels else None
    previous_text = "이전 최저가 기록 없음"
    if previous_lowest is not None:
        previous_text = f"이전 최저가: {money(previous_lowest, currency)}"

    guest_text = f"성인 {adults}명"
    if children > 0:
        guest_text += f", 어린이 {children}명(나이: {children_ages})"

    return f"""
    <html>
      <body>
        <h2>호텔 가격 알림</h2>
        <p><b>지역</b> {html.escape(location)}</p>
        <p><b>숙박일</b> {check_in_date} ~ {check_out_date}</p>
        <p><b>숙박객</b> {html.escape(guest_text)}</p>
        <p><b>현재 최저가:</b> {money(current_lowest, currency)}</p>
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
          가격은 조회 시점 기준이며 예약 화면의 세금, 수수료, 환율, 조건에 따라 달라질 수 있습니다.
        </p>
      </body>
    </html>
    """


def send_email(subject: str, html_body: str, to_email: str) -> None:
    gmail_user = os.environ["GMAIL_USER"]
    gmail_app_password = os.environ["GMAIL_APP_PASSWORD"]

    if not to_email:
        raise ValueError("이메일 수신자가 비어 있습니다.")

    msg = MIMEText(html_body, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(gmail_user, gmail_app_password)
        smtp.send_message(msg)


def process_alert(alert: Dict[str, Any]) -> None:
    alert_id = alert.get("id")
    location = str(alert["location"])
    to_email = str(alert.get("email") or alert.get("to_email") or os.environ.get("TO_EMAIL", "")).strip()
    adults = int(alert.get("adults", 2))
    children = int(alert.get("children", 0))
    children_ages = str(alert.get("children_ages", ""))
    currency = str(alert.get("currency", "KRW"))
    top_n = int(alert.get("top_n", 5))
    min_rating = float(alert.get("min_rating", 0))
    send_only_when_price_drops = bool(alert.get("send_only_when_price_drops", False))

    check_in_date, check_out_date = get_trip_dates(alert)
    previous_lowest = get_previous_lowest_price(alert_id, location, check_in_date, check_out_date)

    raw_hotels = search_hotels_with_serpapi(
        location=location,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        adults=adults,
        children=children,
        children_ages=children_ages,
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
            html_body=f"<p>{html.escape(location)} / {check_in_date} ~ {check_out_date} 조건에서 가격 정보를 찾지 못했습니다.</p>",
            to_email=to_email,
        )
        print(f"{to_email}: 검색 결과 없음")
        return

    current_lowest = cheapest_hotels[0]["price"]
    save_price_history(alert_id, location, check_in_date, check_out_date, cheapest_hotels)

    if (
        send_only_when_price_drops
        and previous_lowest is not None
        and current_lowest >= previous_lowest
    ):
        print(
            f"{to_email}: 가격 하락 없음. 현재 최저가={current_lowest}, 이전 최저가={previous_lowest}. 이메일 발송 생략."
        )
        return

    html_body = build_email_html(
        location=location,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        adults=adults,
        children=children,
        children_ages=children_ages,
        currency=currency,
        hotels=cheapest_hotels,
        previous_lowest=previous_lowest,
    )

    subject = f"[호텔 최저가] {location} {check_in_date} TOP {len(cheapest_hotels)}"
    send_email(subject, html_body=html_body, to_email=to_email)
    print(f"{to_email}: 이메일 발송 완료")


def main() -> None:
    alerts = load_active_alerts()
    if not alerts:
        print("활성 알림이 없습니다.")
        return

    failures = []
    for alert in alerts:
        try:
            process_alert(alert)
        except Exception as exc:
            target = alert.get("email") or alert.get("to_email") or alert.get("id") or "unknown"
            failures.append(f"{target}: {exc}")
            print(f"{target}: 처리 실패 - {exc}")

    if failures:
        raise RuntimeError("일부 알림 처리 실패\n" + "\n".join(failures))


if __name__ == "__main__":
    main()
