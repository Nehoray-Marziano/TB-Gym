import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rubik } from "next/font/google";
import "./globals.css";
import GSAPRegistry from "@/components/gsap-registry";
import CustomCursor from "@/components/ui/CustomCursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"], // Comprehensive weights
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
    <html lang="he" dir="rtl">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${rubik.variable} antialiased font-sans`}
      >
        <GSAPRegistry>
          <CustomCursor />
          <style dangerouslySetInnerHTML={{
            __html: `
            :root {
              --background: 19 21 18;
              --foreground: 236 240 231;
              --card: 19 21 18;
              --card-foreground: 236 240 231;
              --popover: 19 21 18;
              --popover-foreground: 236 240 231;
              --primary: 156 169 134;
              --primary-foreground: 19 21 18;
              --secondary: 26 28 25;
              --secondary-foreground: 236 240 231;
              --muted: 95 111 82;
              --muted-foreground: 163 177 160;
              --accent: 201 213 181;
              --accent-foreground: 19 21 18;
              --destructive: 127 29 29;
              --destructive-foreground: 254 242 242;
              --border: 44 48 43;
              --input: 44 48 43;
              --ring: 156 169 134;
              --radius: 0.5rem;
            }
          `}} />
          {children}
        </GSAPRegistry>
      </body>
    </html>
  );
}
