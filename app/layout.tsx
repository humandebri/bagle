import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import {Shippori_Mincho , Montserrat} from 'next/font/google'
import { ThemeProvider } from "next-themes"
import Navbar from "@/components/navbar"
import { Toaster } from "@/components/ui/sonner"


const montserrat = Montserrat({ 
  subsets: ['latin'],
  // 必要に応じて調整
  weight: ['400', '700'],
  variable: '--font-montserrat', // Tailwindで使用する変数名
})

const shipporiMincho = Shippori_Mincho({
  weight: ['400', '500', '700'], // 必要な太さを選択
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-shippori-mincho',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | Bagel',
    default: 'Bagel',
  },
  description: '美味しいベーグルをオンラインでご注文いただけます',
  openGraph: {
    title: 'Bagel',
    images: ['/images/bagle_shop_image.jpg'],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${montserrat.variable} ${shipporiMincho.variable}`}>
      <body className={`${montserrat.className} text-gray-500`}>

        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Navbar />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
