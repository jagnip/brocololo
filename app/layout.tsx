import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "sonner";
import { AppSidebarContainer } from "@/components/app-sidebar-container";
import { RedirectToast } from "@/components/redirect-toast";

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

// Avoid build-time prerender DB access; render pages on demand.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppSidebarContainer>{children}</AppSidebarContainer>
        <Suspense fallback={null}>
          <RedirectToast />
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
