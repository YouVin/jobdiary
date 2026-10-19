import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SEARCH_INDEXABLE } from "@/lib/siteMetadata";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | 지원 내역과 취업 준비 기록`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: SEARCH_INDEXABLE, follow: SEARCH_INDEXABLE },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
