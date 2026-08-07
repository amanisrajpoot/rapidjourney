import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Journey",
  description: "Find people going your way.",
  manifest: "/manifest.json", // We'll add this later for PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Journey",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Disable pinch zoom for app-like feel
  userScalable: false,
  viewportFit: "cover", // Ensure it fills the screen on notched devices
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <AuthProvider>
          <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-black">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
