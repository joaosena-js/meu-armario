import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Meu Armário", template: "%s | Meu Armário" },
  description: "Controle do estoque de casa, lista de compras e comparação de preços.",
  applicationName: "Meu Armário",
  appleWebApp: { capable: true, title: "Meu Armário", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#151a21" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="h-full">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
