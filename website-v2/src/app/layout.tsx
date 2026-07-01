import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LANpad - Share Clipboard, Files & Text Instantly",
  description: "Quickly copy and paste text, share files, and link your devices on your local network. Private, secure, and works instantly without setup.",
  openGraph: {
    title: "LANpad - Share Clipboard, Files & Text Instantly",
    description: "Quickly copy and paste text, share files, and link your devices on your local network. Private, secure, and works instantly without setup.",
    url: "https://www.lanpad.app",
    siteName: "LANpad",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "LANpad Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LANpad - Share Clipboard, Files & Text Instantly",
    description: "Quickly copy and paste text, share files, and link your devices on your local network. Private, secure, and works instantly without setup.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo-favicon.png",
    apple: "/logo-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${outfit.variable} ${mono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
