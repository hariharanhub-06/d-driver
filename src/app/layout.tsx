import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import dynamic from 'next/dynamic';

const NotificationToast = dynamic(() => import('@/components/ui/NotificationToast'), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "D-Driver | Premium School Transport CRM",
  description: "Enterprise SaaS Web Application for Multi-tenant School Transport Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <NotificationToast />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
