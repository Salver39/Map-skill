import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product/CX Research — Карта компетенций",
  description:
    "Интерактивный инструмент самооценки компетенций Product/CX исследователей",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
