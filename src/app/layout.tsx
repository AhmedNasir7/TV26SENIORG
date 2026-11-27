import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";
import { themeInitScript } from "@/lib/theme";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Attio type system: Inter with the optical-size axis ("opsz" 14 for text, 32 for the Display cut),
// Newsreader as the serif accent, JetBrains Mono for code and figures.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#101010",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The init script sets the theme class before React hydrates
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* eslint-disable-next-line @next/next/no-css-tags -- plain file on purpose, see the file */}
        <link rel="stylesheet" href="/select.css" />
      </head>
      <body
        className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ToasterProvider />
        <ConfirmProvider>{children}</ConfirmProvider>
        <ThemeToggle placement="floating" />
      </body>
    </html>
  );
}
