import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TrailHub — טיולים מודרכים",
  description: "מצא והירשם לטיולים מודרכים בישראל",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#f5f5f5] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
