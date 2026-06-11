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
  title: "LANpad | Intelligent Input Orchestration",
  description: "Turn your phone into a low-latency input companion. High-fidelity text transfer, realistic typing simulation, and local-only security.",
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
