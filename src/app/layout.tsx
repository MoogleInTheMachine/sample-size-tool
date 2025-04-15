import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import type { Metadata } from "next";

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
  description: "A growing collection of UX research tools to support UX researchers and designers.",
  openGraph: {
    title: "Moogle in the Machine",
    description: "A growing collection of UX research tools to support UX researchers and designers.",
    url: "https://moogleinthemachine.com",
    siteName: "Moogle in the Machine",
    images: [
      {
        url: "/moogle-og.png", // Make sure this file exists in /public
        width: 1200,
        height: 630,
        alt: "Moogle in the Machine Open Graph Image",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moogle in the Machine",
    description: "UX research tools to boost confidence and reduce imposter syndrome.",
    images: ["/moogle-og.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black dark:bg-[#0f0f23] dark:text-white`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <div className="min-h-screen font-sans p-4">
            <main className="max-w-3xl mx-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}