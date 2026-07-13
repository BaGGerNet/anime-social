import "./globals.css";

export const metadata = {
  title: "Circle — сообщество анимешников",
  description: "Место, где аниме-фанаты находят своих людей",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
