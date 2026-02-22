import type { Metadata } from "next"
import "./globals.css"
import { Footer } from "@/components/footer"
import { DisclaimerModal } from "@/components/disclaimer-modal"

export const metadata: Metadata = {
  title: "Axiom Risk Review",
  description: "Decentralized risk intelligence for crypto projects. AI-proposed, validator-confirmed, on-chain.",
  openGraph: {
    title: "Axiom Risk Review",
    description: "AI-proposed. Validator-confirmed. On-chain.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen antialiased">
        <div className="flex-1">{children}</div>
        <Footer />
        <DisclaimerModal />
      </body>
    </html>
  )
}