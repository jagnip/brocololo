import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brocololo",
  description: "Recipes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen`}
      >
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex gap-2 p-4">
            <Button variant="outline">Vegetarian</Button>
            <Button variant="outline">Chicken</Button>
            <Button variant="outline">Beef</Button>
            <Button variant="outline">Pork</Button>
            <Button variant="outline">Fish</Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
