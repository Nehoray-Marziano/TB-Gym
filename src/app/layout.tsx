import type { Metadata, Viewport } from "next";
import { Varela_Round } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GymStoreProvider } from "@/providers/GymStoreProvider";
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
    statusBarStyle: "black-translucent",
    title: "סטודיו טליה",
    startupImage: [
      {
        url: "/apple-splash-1179-2556.png",
        media: "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-1170-2532.png",
        media: "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-1290-2796.png",
        media: "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-1284-2778.png",
        media: "screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-1125-2436.png",
        media: "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/apple-splash-828-1792.png",
        media: "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/apple-splash-750-1334.png",
        media: "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
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
              <GymStoreProvider>
                <ConnectedOneSignalProvider />
                <PWAInstallProvider>
                  {children}
                </PWAInstallProvider>
              </GymStoreProvider>
            </ToastProvider>
          </MotionProvider>
        </ThemeProvider>
      </body >
    </html >
  );
}

