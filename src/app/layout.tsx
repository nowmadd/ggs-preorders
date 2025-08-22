import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import Providers from "../providers";
import Header from "@/components/Header/Header";
import { Suspense } from "react";
import { AppToaster } from "../components/ui/app-toaster";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300"], // pick what you need
  display: "swap",
  variable: "--font-lato", // for Tailwind use
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
          <body className="font-sans min-h-screen bg-gray-50 text-gray-900">
            <AppToaster />
            <Header />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </body>
        </Suspense>
      </Providers>
    </html>
  );
}
