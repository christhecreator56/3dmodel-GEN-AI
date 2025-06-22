"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, CuboidIcon as Cube, Zap } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function HomeScreen() {
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleGetStarted = () => {
    router.push("/generate")
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black bg-radial-gradient overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-white/10 rotate-45 animate-pulse" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-white/5 rotate-12 animate-pulse delay-1000" />
        <div className="absolute bottom-32 left-20 w-3 h-3 bg-white/15 rotate-45 animate-pulse delay-2000" />
        <div className="absolute bottom-20 right-10 w-5 h-5 bg-white/8 rotate-12 animate-pulse delay-500" />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-xl animate-pulse delay-300" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-l from-white/3 to-transparent rounded-full blur-2xl animate-pulse delay-700" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Logo and title section */}
        <div
          className={`text-center mb-12 transition-all duration-1000 ease-out ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main title */}
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent animate-text-glow">
              HYPER 3D
            </span>
          </h1>

          <h2 className="text-3xl md:text-4xl font-light text-gray-300 mb-6 tracking-wide">genAI</h2>

          {/* Version */}
          <p className="text-sm text-gray-500 font-mono tracking-wider">ver 0.1</p>
        </div>

        {/* Feature highlights */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl transition-all duration-1000 ease-out delay-300 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <Cube className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-400 text-sm">Generate detailed 3D models from text prompts and images</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <Zap className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400 text-sm">Advanced processing with real-time progress tracking</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <Sparkles className="h-8 w-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-2">High Quality</h3>
            <p className="text-gray-400 text-sm">Professional-grade models with multiple export formats</p>
          </div>
        </div>

        {/* CTA Button */}
        <div
          className={`transition-all duration-1000 ease-out delay-500 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Button
            onClick={handleGetStarted}
            className="bg-white hover:bg-gray-200 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 group"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Subtitle */}
        <div
          className={`mt-8 text-center transition-all duration-1000 ease-out delay-700 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-gray-400 text-sm max-w-md">
            Transform your ideas into stunning 3D models with the power of artificial intelligence
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div
          className={`transition-all duration-1000 ease-out delay-1000 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-gray-600 text-xs text-center">Powered by Hyper3D Rodin</p>
        </div>
      </div>
    </div>
  )
}
