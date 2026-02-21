import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Footer } from "@/components/footer"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Axiom Risk Review | Decentralized Risk Intelligence",
  description:
    "Intelligent Smart Contract verification with validator consensus. Analyze any crypto project for smart contract, tokenomics, and market risks.",
}

export const viewport: Viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {/* First-run disclaimer — localStorage-gated, renders once per user */}
        <DisclaimerModal />

        {/* Page content */}
        <div className="flex-1">{children}</div>

        {/* Persistent disclaimer footer */}
        <Footer />
      </body>
    </html>
  )
}