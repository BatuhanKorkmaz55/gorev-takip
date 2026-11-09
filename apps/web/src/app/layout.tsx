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
  themeColor: "#15171b",
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `try{if(localStorage.getItem("gt-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="dark" className={atkinson.variable} suppressHydrationWarning>
      <head>
        {/* Varsayılan koyu tema; kişi açık temayı seçtiyse sayfa çizilmeden önce uygula. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
