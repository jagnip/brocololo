import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Brocololo",
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
    <html lang="en">
      <body className={`${quicksand.variable} font-sans antialiased`}>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={{
            cssLayerName: "clerk",
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
