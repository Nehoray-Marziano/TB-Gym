import type { Metadata, Viewport } from "next";
import { Varela_Round } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GymStoreProvider } from "@/providers/GymStoreProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PWAInstallGate from "@/components/PWAInstallGate";
import ConnectedOneSignalProvider from "@/components/ConnectedOneSignalProvider";


// Only load the Hebrew font we actually use
const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap", // Prevent font blocking render
});

export const metadata: Metadata = {
  title: "Talia Gym | Premium Fitness",
  description: "Experience the next level of fitness with Talia.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Talia Gym",
  },
  icons: {
    icon: "/notification-icon.png",
    shortcut: "/notification-icon.png",
    apple: "/apple-icon.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
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
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <GymStoreProvider>
              <ConnectedOneSignalProvider />
              <PWAInstallGate>
                {children}
              </PWAInstallGate>
            </GymStoreProvider>
          </ToastProvider>
        </ThemeProvider>
      </body >
    </html >
  );
}

