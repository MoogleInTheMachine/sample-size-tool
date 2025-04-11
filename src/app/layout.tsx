import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moogle in the Machine",
  description: "A growing collection of UX research tools that bring clarity, confidence, and statistical insight to your work.",
  openGraph: {
    title: "Moogle in the Machine",
    description: "A growing collection of UX research tools for confident UX decisions.",
    url: "https://moogleinthemachine.com", // use your live domain here
    siteName: "Moogle in the Machine",
    images: [
      {
        url: "/moogle-og.png",
        width: 1200,
        height: 630,
        alt: "Moogle in the Machine logo with pixel moogle character",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moogle in the Machine",
    description: "A growing collection of UX research tools for confident UX decisions.",
    images: ["/moogle-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
      <link rel="icon" href="/favicon-v2.ico" />
    </head>
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {children}
    </body>
  </html>
  );
}
