import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastViewport } from "@/components/ToastViewport";
import { themeInitScript } from "@/lib/theme/theme";
import "./globals.css";
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KinSight — Sales Relationship Intelligence",
  description:
    "Capture client conversations and build stronger sales relationships with KinSight.",
  icons: {
    icon: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KinSight",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#121214" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="no-scrollbar antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          {children}
          <ToastViewport />
        </ThemeProvider>
      </body>
    </html>
  );
}
