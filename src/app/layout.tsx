// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CSPostHogProvider } from "./providers/posthog-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner"; // CORRECTED IMPORT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LearnBridgeEdu - AI-Powered Learning for Ghana's SBC",
  description: "Transforming how KG–SHS students learn, collaborate, and grow with personalized learning, social connection, and deep engagement.",
  icons: {
    icon: '/LearnBridge logo FAVICON.png',
    shortcut: '/LearnBridge logo FAVICON.png',
    apple: '/LearnBridge logo FAVICON.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CSPostHogProvider>
            {children}
            <Toaster richColors /> {/* CORRECTED COMPONENT */}
          </CSPostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}