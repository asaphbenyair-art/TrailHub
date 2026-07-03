import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import BottomNav from "@/components/BottomNav";
import { CalendarModeProvider } from "@/components/CalendarModeProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

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
  title: "בשבילי — נברא העולם",
  description: "מצא והירשם לטיולים מודרכים בישראל",
};

// Apply the theme before first paint to avoid a flash of the wrong mode.
// Priority: saved localStorage → system preference → default dark.
const themeInit = `(function(){try{var t=localStorage.getItem('trailhub-theme');var light=t?t==='light':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('theme-light',!!light);}catch(e){}})();`;

// Apply the saved UI language (direction + lang) before first paint.
const langInit = `(function(){try{var l=localStorage.getItem('trailhub-lang');if(l==='en'||l==='he'){document.documentElement.lang=l;document.documentElement.dir=l==='he'?'rtl':'ltr';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`h-full ${playfair.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: langInit }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-bg text-fg antialiased">
        <Providers>
          <LanguageProvider>
            <ThemeProvider>
              <CalendarModeProvider>
                {children}
                <BottomNav />
              </CalendarModeProvider>
            </ThemeProvider>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
