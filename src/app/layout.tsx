import type { Metadata, Viewport } from "next";
import AuthProvider from "@/components/providers/AuthProvider";
import BottomNav from "@/components/common/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Sanctuary | STAI",
  description: "AI가 당신의 실제 공부 시간을 초단위로 측정합니다",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STAI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b1326",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0b1326] text-[#dae2fd] font-inter antialiased">
        <AuthProvider>
          <div className="pb-20">{children}</div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
