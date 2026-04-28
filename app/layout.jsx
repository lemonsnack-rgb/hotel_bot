import './globals.css';

export const metadata = {
  title: 'Hotel Bot Admin',
  description: 'Hotel price alert bot admin page',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
