import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../providers";
import Header from "@/components/Header/Header";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GGs Hobby Preorders",
  description:
    "Browse and reserve upcoming TCG products, collectibles, and hobby items at GGs Hobby. Secure your preorders and never miss a release.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <Suspense fallback={null}>
          <Header />
          <body className="min-h-screen bg-gray-50 text-gray-900">
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </body>
        </Suspense>
      </Providers>
    </html>
  );
}
