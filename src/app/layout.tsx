import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PaddleProvider from '@/components/PaddleProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SnackDrama - Watch Vertical Drama Series',
  description: 'Binge short-form drama episodes. Free to start, unlock more with coins.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <PaddleProvider>
          {children}
        </PaddleProvider>
      </body>
    </html>
  )
}
