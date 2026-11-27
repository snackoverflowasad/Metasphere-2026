import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://metasphere2027.iem.edu.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MetaSphere 2027: Global Conference on Cloud Computing, Virtualization & Metaverse",
    template: "%s | MetaSphere",
  },
  description:
    "MetaSphere is the premier international conference on Cloud Computing, Virtualization, and the Metaverse ecosystem, organized by the Department of Computer Application (BCA) and IEM Centre of Excellence, Kolkata, India.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/Assets/Logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/Assets/Logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-[#fffbf5] text-[#1a202c] font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
