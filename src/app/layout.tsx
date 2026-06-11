import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeContextProvider } from "@/context/ThemeContext";
import { SchoolBrandingProvider } from "@/context/SchoolBrandingContext";
import { LanguageProvider } from "@/context/LanguageContext";
import dynamic from 'next/dynamic';

const NotificationToast = dynamic(() => import('@/components/ui/NotificationToast'), { ssr: false });
const KeepAlive = dynamic(() => import('@/components/KeepAlive'), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bus Transport Portal",
  description: "School Bus Transport Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeContextProvider>
          <AuthProvider>
            <LanguageProvider>
              <SchoolBrandingProvider>
                <NotificationToast />
                <KeepAlive />
                {children}
              </SchoolBrandingProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
