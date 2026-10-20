import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
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
import { APPLE_STATUS_BAR_STYLE } from "@/types/theme";
import "./globals.css";

const montserrat = localFont({
  src: "./fonts/Montserrat-latin-wght-normal.woff2",
  variable: "--font-montserrat",
  display: "swap",
  weight: "400 800",
});

const inter = localFont({
  src: "./fonts/Inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "400 600",
});

export async function generateMetadata(): Promise<Metadata> {
  const preference = await getServerThemePreference();

  return {
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
      statusBarStyle: APPLE_STATUS_BAR_STYLE,
      title: "KinSight",
    },
    other: {
      "apple-mobile-web-app-status-bar-style": APPLE_STATUS_BAR_STYLE,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const preference = await getServerThemePreference();

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    colorScheme:
      preference === "light"
        ? "light"
        : preference === "dark"
          ? "dark"
          : "light dark",
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
      <body
        className="overflow-hidden bg-background text-foreground no-scrollbar antialiased"
        style={chromeColor ? { backgroundColor: chromeColor } : undefined}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <AppShell>
            {/* Single iOS top inset: env(safe-area-inset-top) once. Do not stack or remove. */}
            <div
              id="app-root"
              className="app-shell mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)]"
            >
              <main className="app-scroll no-scrollbar flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none px-3 pb-[60px]">
                {children}
              </main>
            </div>
          </AppShell>
          <ToastViewport />
        </ThemeProvider>
        {/* Direct body child. Do not wrap in flex/main/page shells. */}
        <Navigation />
      </body>
    </html>
  );
}
