import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine } from 'geist/font/pixel';
import "./globals.css";
import { ToastProvider, AnchoredToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ThemeProvider } from "@/components/theme-provider";
import { OrgProvider } from "@/components/providers/org-provider";


const interHeading = Inter({subsets:['latin'],variable:'--font-heading'});

export const metadata: Metadata = {
  title: "Autobox",
  description: "Sistema de gestión para talleres automotrices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", GeistSans.variable, GeistMono.variable, GeistPixelSquare.variable, GeistPixelGrid.variable, GeistPixelCircle.variable, GeistPixelTriangle.variable, GeistPixelLine.variable, interHeading.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <ConvexAuthNextjsServerProvider>
            <ConvexClientProvider>
              <OrgProvider>
                <ToastProvider position="top-center">
                  <AnchoredToastProvider>
                    {children}
                  </AnchoredToastProvider>
                </ToastProvider>
              </OrgProvider>
            </ConvexClientProvider>
          </ConvexAuthNextjsServerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
