import "./globals.css";
import NotificationToasts from "../components/NotificationToasts";

export const metadata = {
  title: "res_scales — сообщество анимешников",
  description: "Место, где аниме-фанаты находят своих людей",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="font-body min-h-screen">
        {children}
        <NotificationToasts />
      </body>
    </html>
  );
}
