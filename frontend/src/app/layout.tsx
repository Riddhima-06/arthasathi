import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArthaSathi — Autonomous Financial Platform",
  description: "Rural Micro-Entrepreneur Financial Advisory & Statutory Margin Validation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0B0C10] text-zinc-100 m-0 p-0 overflow-x-hidden antialiased`}>
        <Navbar />
        <main className="w-full min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}