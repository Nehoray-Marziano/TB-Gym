import type { Metadata, Viewport } from "next";
import { Varela_Round } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import GymBootstrapProvider from "@/providers/GymBootstrapProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ConnectionStatus from "@/components/ConnectionStatus";
import { PWAInstallProvider } from "@/components/PWAInstallProvider";
import ConnectedOneSignalProvider from "@/components/ConnectedOneSignalProvider";
import MotionProvider from "@/components/MotionProvider";
// Only load the Hebrew font we actually use
const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "optional", // Prevent layout shift during initial load
});

export const metadata: Metadata = {
  title: "סטודיו טליה | האימונים שלך",
  description: "האימונים, ההרשמות והיתרה שלך במקום אחד.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "סטודיו טליה",
  },
  icons: {
    icon: "/pwa-icon-v3-192.png",
    shortcut: "/pwa-icon-v3-192.png",
    apple: "/apple-touch-icon-v3.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e9eadc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${varelaRound.variable} antialiased font-sans`}
      >
        <ServiceWorkerRegister />
        <ConnectionStatus />
        <ThemeProvider>
          <MotionProvider>
            <ToastProvider>
              <GymBootstrapProvider>
                <ConnectedOneSignalProvider />
                <PWAInstallProvider>
                  {children}
                </PWAInstallProvider>
              </GymBootstrapProvider>
            </ToastProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

