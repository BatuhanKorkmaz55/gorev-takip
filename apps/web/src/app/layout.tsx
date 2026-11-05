import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Okunurluk için tasarlanmış yazı tipi; latin-ext Türkçe karakterleri kapsar.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin", "latin-ext"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Görev Takip", template: "%s · Görev Takip" },
  description: "Ekip için basit ve hızlı iş takibi",
};

export const viewport: Viewport = {
  themeColor: "#1c1f24",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={atkinson.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
