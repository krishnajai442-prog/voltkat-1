import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Toaster } from "@/components/ui/Toaster";
import { siteUrl } from "@/lib/utils";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { HideOnProduct } from "@/components/HideOnProduct";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: "VoltKart — Buy Phones, Laptops & Appliances Online in India",
    template: "%s · VoltKart",
  },
  description:
    "India's premium single-store electronics retailer. Genuine products, no-cost EMI, exchange bonuses, bank offers and fast delivery.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl("/"),
    siteName: "VoltKart",
    title: "VoltKart — Buy Phones, Laptops & Appliances Online in India",
    description:
      "Genuine electronics, transparent pricing, no-cost EMI, exchange support and dependable delivery across India.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltKart — Buy Phones, Laptops & Appliances Online in India",
    description:
      "India's premium single-store electronics retailer. Genuine products, no-cost EMI and fast delivery.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1024",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-[#f1f3f6]ns text-ink-900 antialiased">
        <CartProvider>
          <Header />
          <main className="min-h-[60vh] pb-20 md:pb-0">{children}</main>
          {/* <Footer /> */}
          <HideOnProduct>
            <MobileTabBar />
            <MobileBottomNav />
          </HideOnProduct>
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}