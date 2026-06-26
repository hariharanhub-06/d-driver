import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeContextProvider } from "@/context/ThemeContext";
import { SchoolBrandingProvider } from "@/context/SchoolBrandingContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { getSiteEnabled } from "@/lib/site-status";
import AccessDenied403 from "@/components/AccessDenied403";
import PWARegister from "@/components/PWARegister";
import dynamic from 'next/dynamic';

const NotificationToast = dynamic(() => import('@/components/ui/NotificationToast'), { ssr: false });
const KeepAlive = dynamic(() => import('@/components/KeepAlive'), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://d-driver.vercel.app"),
  title: "Onlive — School Bus Tracking",
  description: "Onlive — School bus transport management & live tracking",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onlive",
  },
  // Favicon / app icons are auto-detected from src/app/{favicon.ico,icon.png,apple-icon.png}.
  openGraph: {
    title: "Onlive — School Bus Tracking",
    description: "Track your child's school bus live — trip details, fees and alerts.",
    type: "website",
    siteName: "Onlive",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Onlive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Onlive — School Bus Tracking",
    description: "Live school bus tracking & management.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2dbc75",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Central kill switch: when disabled from the Harish hub, every route shows a 403.
  const siteEnabled = await getSiteEnabled("ddriver");

  if (!siteEnabled) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <AccessDenied403 />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeContextProvider>
          <AuthProvider>
            <LanguageProvider>
              <SchoolBrandingProvider>
                <NotificationToast />
                <KeepAlive />
                <PWARegister />
                {children}
              </SchoolBrandingProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
