import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Nossa Casa – Controle Financeiro",
  applicationName: "Nossa Casa",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: `${base}/icons/apple-touch-icon.png`,
  },
  appleWebApp: { capable: true, title: "Nossa Casa", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
