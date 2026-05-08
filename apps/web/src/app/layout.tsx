import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "EqubChain - Decentralized Rotating Savings Protocol",
  description: "Trustless rotating savings powered by Solana, AI reputation, and programmable finance. The future of community finance built on blockchain.",
  keywords: ["solana", "defi", "rotating savings", "equb", "chit fund", "tontine", "blockchain", "cryptocurrency"],
  authors: [{ name: "EqubChain Team" }],
  creator: "EqubChain",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://equbchain.com",
    title: "EqubChain - Decentralized Rotating Savings Protocol",
    description: "Trustless rotating savings powered by Solana, AI reputation, and programmable finance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EqubChain - Decentralized Rotating Savings Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EqubChain - Decentralized Rotating Savings Protocol",
    description: "Trustless rotating savings powered by Solana, AI reputation, and programmable finance.",
    images: ["/og-image.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
