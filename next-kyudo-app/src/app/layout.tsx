import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '弓道大会運営システム',
  description:
    'Next.jsとFirebaseを利用した弓道大会運営・進行管理アプリケーション',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        {/* shadcn/ui の Sonner 通知を表示するためのプロバイダを配置 */}
        <Toaster />
      </body>
    </html>
  );
}
