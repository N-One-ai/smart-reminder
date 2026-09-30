import type { Metadata, Viewport } from "next";
import { Geologica } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import { getLocale } from "@/lib/i18n/get-locale";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

// Single variable font for both headings and body — Geologica (Google
// Fonts, OFL) covers the full weight range (100–900) with full Vietnamese
// diacritic support, so --font-heading and --font-sans both point at it.
const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Rymi",
  description: "Đừng bắt tôi phải nhớ. Hãy để Rymi nhớ giúp tôi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rymi",
  },
  icons: {
    icon: [{ url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#292b1f",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geologica.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider locale={locale}>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
