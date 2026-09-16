import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
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
  title: "ET.TEE Fashion | Thời trang thông minh",
  description: "Nền tảng thương mại điện tử ET.TEE với hệ thống gợi ý AI, quản lý cửa hàng, khách hàng và admin.",
  keywords: ["ET.TEE", "fashion", "thời trang", "AI", "ecommerce"],
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
