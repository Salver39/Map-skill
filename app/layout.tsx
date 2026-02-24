import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UX/CX Research — Карта компетенций",
  description:
    "Интерактивный инструмент самооценки компетенций UX/CX исследователей",
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
