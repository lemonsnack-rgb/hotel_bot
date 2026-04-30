import './globals.css';

export const metadata = {
  title: '호텔 가격 알림',
  description: '공유 링크로 등록하는 호텔 가격 알림',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
