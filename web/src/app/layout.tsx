import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import CartDrawer from "@/components/cart/CartDrawer";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "ET.TEE - Thời trang gia đình, mặc đẹp mỗi ngày",
  description: "Khám phá bộ sưu tập thời trang mới nhất dành cho gia đình Việt. Áo phông, áo khoác, váy đầm thiết kế chuẩn form dáng, chất liệu cao cấp.",
  keywords: ["ET.TEE", "fashion", "thời trang", "AI", "ecommerce"],
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} min-h-screen flex flex-col bg-white`}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Header />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
              <Footer />
              <CartDrawer />
              <Toaster position="top-center" richColors />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
