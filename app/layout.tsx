import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for titles only (type-h1/h2/h3 utilities in globals.css).
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "NomNom",
  description: "Recipes",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable}`}
    >
      <body className="font-sans antialiased">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={{
            cssLayerName: "clerk",
            layout: {
              applicationName: "NomNom",
            },
            variables: {
              colorPrimary: "var(--primary)",
              colorBackground: "var(--background)",
              colorText: "var(--foreground)",
              colorInputBackground: "var(--card)",
              colorInputText: "var(--foreground)",
              borderRadius: "var(--radius)",
            },
          }}
        >
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
