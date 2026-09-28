import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import ClientBottomNav from "@/components/ClientBottomNav";
import CapacitorInit from "@/components/CapacitorInit";
import BrandFonts from "@/components/BrandFonts";
import OrderMonitor from "@/components/OrderMonitor";
import { GoogleOAuthProvider } from '@react-oauth/google';

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const GOOGLE_WEB_CLIENT_ID = "514222866895-c11vn2eb5u15hi6d5ib0eb4d10cdo3oq.apps.googleusercontent.com";

export const metadata: Metadata = {
  title: "Steam Iron Partner",
  description: "Delivery Partner mobile web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${montserrat.variable} ${manrope.variable} antialiased bg-white`}
        suppressHydrationWarning={true}
      >
        <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
          <div className="w-full min-h-screen flex flex-col bg-white safe-area" suppressHydrationWarning>
            <CapacitorInit />
        <BrandFonts />
            <OrderMonitor />
            <main className="flex-1">{children}</main>
            <ClientBottomNav />
          </div>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}