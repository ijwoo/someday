import type { Metadata } from 'next'
import { DM_Serif_Display, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const notoSansKr = Noto_Sans_KR({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-noto-kr',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Someday',
  description: '언젠가 가야지 했던 곳들, 이제 가보자',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${dmSerif.variable} ${notoSansKr.variable}`}>
      <body style={{ fontFamily: 'var(--font-noto-kr), -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
