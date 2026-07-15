import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserFlowProvider } from '../lib/userFlow';
import CookieBanner from '../components/CookieBanner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jagger OS · Portfolio",
  description: "品牌設計、網站開發、AI 輔助工作流程。由 Jagger Su 主理。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <UserFlowProvider>
          {children}
          <CookieBanner />
        </UserFlowProvider>
      </body>
    </html>
  );
}
