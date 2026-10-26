import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import RootLayoutWrapper from "@/components/layout/RootLayoutWrapper";
import { Toaster } from 'sonner';

// One sans family for the whole site. The body used to get Inter from here while every
// element with `font-sans` (and the staff area) resolved to Be Vietnam Pro from a CSS
// @import, so plain text and utility-styled text rendered in two different fonts.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-be-vietnam",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "ET.TEE - Thời trang gia đình, mặc đẹp mỗi ngày",
    template: "%s | ET.TEE Fashion",
  },
  description: "Khám phá bộ sưu tập thời trang mới nhất dành cho gia đình Việt. Áo phông, áo khoác, váy đầm thiết kế chuẩn form dáng, chất liệu cao cấp từ thương hiệu ET.TEE.",
  keywords: ["ET.TEE", "thời trang gia đình", "áo thun cao cấp", "đồ đôi", "thời trang thiết kế", "ET.TEE Fashion"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://et-tee.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ET.TEE - Thời trang gia đình, mặc đẹp mỗi ngày",
    description: "Khám phá bộ sưu tập thời trang mới nhất dành cho gia đình Việt. Áo phông, áo khoác, váy đầm thiết kế chuẩn form dáng, chất liệu cao cấp.",
    url: "https://et-tee.com",
    siteName: "ET.TEE Fashion",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "ET.TEE Fashion - Thời trang gia đình",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ET.TEE - Thời trang gia đình, mặc đẹp mỗi ngày",
    description: "Khám phá bộ sưu tập thời trang mới nhất dành cho gia đình Việt.",
    images: ["/images/og-banner.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable}`}>
      <body className={`min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <RootLayoutWrapper>
                {children}
              </RootLayoutWrapper>
              <Toaster position="top-center" richColors />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
