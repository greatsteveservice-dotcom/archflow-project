// Public landing page. Redirects authenticated users to /projects client-side.
import Landing from "./landing/Landing";

export const metadata = {
  title: "Archflow — Дизайн без рутины",
  description:
    "Рабочее пространство для дизайнеров интерьера: авторский надзор, комплектация, электронная подпись, кабинет заказчика.",
};

export default function HomePage() {
  return <Landing />;
}
