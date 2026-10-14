import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const satoshi = localFont({
  src: "../../../ui/fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-satoshi-next",
  adjustFontFallback: "Arial",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const serif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:9210"),
  title: { default: "Kakushi — the private execution layer for Arc", template: "%s · Kakushi" },
  description: "Kakushi move unseen. Your payment arrives. Stealth USDC, in-browser ZK proofs and user-controlled disclosure for Arc apps.",
  applicationName: "Kakushi",
  openGraph: { title: "Kakushi — the private execution layer for Arc", images: [{ url: "/brand/kakushi-logo.png", width: 1254, height: 1254, alt: "Kakushi hooded keyhole mark" }] },
  twitter: { card: "summary", images: ["/brand/kakushi-logo.png"] },
  icons: { icon: "/brand/kakushi-logo.png", apple: "/brand/kakushi-logo.png" },
};

export const viewport: Viewport = { themeColor: "#0B0F1A", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ref-e" className={`${satoshi.variable} ${mono.variable} ${serif.variable}`}>
      <body className="ui-root">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
