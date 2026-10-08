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
import TextCopyPolicy from "@/components/TextCopyPolicy";
import { APPLE_STARTUP_IMAGES, PWA_BACKGROUND } from "@/lib/pwa-startup.mjs";
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
  icons: {
    icon: "/pwa-icon-v5-192.png",
    shortcut: "/pwa-icon-v5-192.png",
    apple: "/apple-touch-icon-v5.png",
  },
};

export const viewport: Viewport = {
  themeColor: PWA_BACKGROUND,
  colorScheme: "light",
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
    <html lang="he" dir="rtl" suppressHydrationWarning style={{ backgroundColor: PWA_BACKGROUND, colorScheme: "light" }}>
      <head>
        {/* Native launch configuration precedes body rendering. Keep the
            existing default status-bar geometry throughout the launch. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="סטודיו טליה" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {APPLE_STARTUP_IMAGES.map(({ href, media }) => (
          <link key={href} rel="apple-touch-startup-image" href={href} media={media} />
        ))}
      </head>
      <body
        suppressHydrationWarning
        style={{ backgroundColor: PWA_BACKGROUND }}
        className={`${varelaRound.variable} antialiased font-sans`}
      >
        <ServiceWorkerRegister />
        <TextCopyPolicy />
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

