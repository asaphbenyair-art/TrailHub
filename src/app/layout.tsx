import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import BottomNav from "@/components/BottomNav";
import { CalendarModeProvider } from "@/components/CalendarModeProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrailHub — טיולים מודרכים",
  description: "מצא והירשם לטיולים מודרכים בישראל",
};

// Apply the saved theme before first paint to avoid a flash of the wrong mode.
const themeInit = `(function(){try{var t=localStorage.getItem('trailhub-theme');if(t==='light')document.documentElement.classList.add('theme-light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`h-full ${playfair.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-bg text-fg antialiased">
        <Providers>
          <CalendarModeProvider>
            {children}
            <BottomNav />
          </CalendarModeProvider>
        </Providers>
      </body>
    </html>
  );
}
