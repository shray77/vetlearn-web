import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { OfflineApiBridge } from "@/components/OfflineApiBridge";
import { DsThemeToggle } from "@/components/DsThemeToggle";

// vet-ds v2.2 «Научная периодика»: Inter (текст, +кириллица),
// IBM Plex Mono (моно), Instrument Serif (латиница заголовков;
// кириллица заголовков деградирует в Georgia из стека в globals.css)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VetLearn AI — Персонализированная платформа обучения ветеринарной медицине",
  description: "AI-платформа для адаптивного обучения ветеринарных студентов. Генерация клинических кейсов, голосовой репетитор, персонализированные рекомендации.",
  keywords: ["ветеринария", "обучение", "AI", "клинические случаи", "адаптивное обучение"],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'VetLearn AI',
    'theme-color': '#4C7A3F',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      // Переменные next/font — на <html>: префлайт Tailwind вешает
      // font-family на html, и var() обязан резолвиться на нём же
      // (на <body> латентно падал в системный стек — баг со времён Geist)
      className={`${inter.variable} ${plexMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <meta name="theme-color" content="#4C7A3F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VetLearn AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerRegistration />
          <OfflineApiBridge />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
          <DsThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
