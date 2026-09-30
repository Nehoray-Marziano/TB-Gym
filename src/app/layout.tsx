import type { Metadata, Viewport } from "next";
import { Varela_Round } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GymStoreProvider } from "@/providers/GymStoreProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { PWAInstallProvider } from "@/components/PWAInstallProvider";
import ConnectedOneSignalProvider from "@/components/ConnectedOneSignalProvider";
import MotionProvider from "@/components/MotionProvider";


// Only load the Hebrew font we actually use
const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap", // Prevent font blocking render
});

export const metadata: Metadata = {
  title: "סטודיו טליה | האימונים שלך",
  description: "האימונים, ההרשמות והיתרה שלך במקום אחד.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "סטודיו טליה",
  },
  icons: {
    icon: "/pwa-icon-192.png",
    shortcut: "/pwa-icon-192.png",
    apple: "/pwa-icon-512.png",
  },

};

export const viewport: Viewport = {
  themeColor: "#162218",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <ThemeProvider
          attribute="class"
          defaultTheme="classic"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "classic"]}
        >
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

