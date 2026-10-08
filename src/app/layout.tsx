import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Montserrat } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastViewport } from "@/components/ToastViewport";
import { themeInitScript } from "@/lib/theme/theme";
import {
  getServerThemeChromeColor,
  getServerThemePreference,
  getViewportThemeColor,
} from "@/lib/theme/theme-server";
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
  title: "KinSight",
  description:
    "Capture client conversations and build stronger sales relationships with KinSight.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    // SSR default; theme-init script sets dark ↔ light per user preference.
    statusBarStyle: "default",
    title: "KinSight",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const preference = await getServerThemePreference();

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    themeColor: getViewportThemeColor(preference),
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preference = await getServerThemePreference();
  const chromeColor = getServerThemeChromeColor(preference);

  return (
    <html
      lang="en"
      data-theme={preference}
      className={`${montserrat.variable} ${inter.variable} bg-background`}
      style={chromeColor ? { backgroundColor: chromeColor } : undefined}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col overflow-hidden bg-background text-foreground no-scrollbar antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <AppShell>
            <div
              id="app-root"
              className="app-shell mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)]"
            >
              <main className="app-scroll no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
                {children}
              </main>
            </div>
            <Navigation />
          </AppShell>
          <ToastViewport />
        </ThemeProvider>
      </body>
    </html>
  );
}
