import type React from "react"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.className}>
      <head>
        <title>Hyper 3D genAI - AI-Powered 3D Model Generator</title>
        <meta name="description" content="Transform your ideas into stunning 3D models with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="bg-black text-white">{children}</body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
