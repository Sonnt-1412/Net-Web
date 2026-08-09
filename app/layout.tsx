import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LướiFlow — Quản lý sản xuất lưới",
  description: "Quản lý đơn hàng, sản xuất, giao hàng và nhận tiền trong một quy trình thống nhất.",
  openGraph: {
    title: "LướiFlow — Quản lý sản xuất lưới",
    description: "Đơn Hàng → Sản Xuất → Đang Giao Hàng → Nhận Tiền",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LướiFlow — Quản lý sản xuất lưới",
    description: "Đơn Hàng → Sản Xuất → Đang Giao Hàng → Nhận Tiền",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
