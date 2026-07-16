import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ScheduleTicker } from "@/components/ScheduleTicker";

export const metadata: Metadata = {
  title: "MapScraper — Leadgen Demo",
  description:
    "Area-based business lead generation using OpenStreetMap public APIs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-[18px] font-semibold tracking-[-0.02em] text-[#37352f]"
              >
                MapScraper
              </Link>
              <p className="text-[12px] text-[rgba(55,53,47,0.45)]">
                OSM leadgen demo · Nominatim + Overpass
              </p>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <ScheduleTicker />
      </body>
    </html>
  );
}
