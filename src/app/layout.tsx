import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "연결정산표 데모 | ConsolBook",
  description:
    "모회사·자회사 별도재무제표를 업로드하면 연결조정과 내부거래 제거를 거쳐 연결정산표를 자동으로 산출하는 데모입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
