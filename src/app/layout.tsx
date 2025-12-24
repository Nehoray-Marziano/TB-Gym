import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Varela_Round } from "next/font/google";
import "./globals.css";
import GSAPRegistry from "@/components/gsap-registry";
import { ToastProvider } from "@/components/ui/use-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { GymStoreProvider } from "@/providers/GymStoreProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["hebrew", "latin"],
  weight: "400",
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
    icon: "/icon.jpg",
    shortcut: "/icon.jpg",
    apple: "/apple-icon.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#E2F163",
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
        className={`${geistSans.variable} ${geistMono.variable} ${varelaRound.variable} antialiased font-sans`}
      >
        <GSAPRegistry>
          <ServiceWorkerRegister />
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <GymStoreProvider>
                {children}
              </GymStoreProvider>
            </ToastProvider>
          </ThemeProvider>
        </GSAPRegistry>
      </body>
    </html>
  );
}
