export interface ImageAnalysis {
  dominantColors: string[]
  brightness: number
  contrast: number
  sharpness: number
  aspectRatio: number
  hasTransparency: boolean
  objectBounds?: { x: number; y: number; width: number; height: number }
}

export class ImageProcessor {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  constructor() {
    // Only create canvas in browser environment
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.canvas = document.createElement("canvas")
      this.ctx = this.canvas.getContext("2d")
    }
  }

  private ensureCanvas(): boolean {
    if (!this.canvas || !this.ctx) {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        this.canvas = document.createElement("canvas")
        this.ctx = this.canvas.getContext("2d")
        return this.canvas !== null && this.ctx !== null
      }
      return false
    }
    return true
  }

  async analyzeImage(file: File): Promise<ImageAnalysis> {
    if (!this.ensureCanvas()) {
      throw new Error("Canvas not available - client-side only")
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        if (!this.canvas || !this.ctx) {
          reject(new Error("Canvas not available"))
          return
        }

        this.canvas.width = img.width
        this.canvas.height = img.height
        this.ctx.drawImage(img, 0, 0)

        const imageData = this.ctx.getImageData(0, 0, img.width, img.height)
        const analysis = this.performAnalysis(imageData, img.width, img.height)
        resolve(analysis)
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private performAnalysis(imageData: ImageData, width: number, height: number): ImageAnalysis {
    const data = imageData.data
    const colorMap = new Map<string, number>()
    let totalBrightness = 0
    let hasTransparency = false
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0

    // Analyze pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      // Check transparency
      if (a < 255) hasTransparency = true

      // Skip fully transparent pixels for object bounds
      if (a > 50) {
        const x = (i / 4) % width
        const y = Math.floor(i / 4 / width)
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }

      // Calculate brightness
      const brightness = (r + g + b) / 3
      totalBrightness += brightness

      // Track dominant colors (simplified)
      const colorKey = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${Math.floor(b / 32) * 32}`
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
    }

    // Get dominant colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => `rgb(${color})`)

    const avgBrightness = totalBrightness / (data.length / 4)
    const contrast = this.calculateContrast(data)
    const sharpness = this.calculateSharpness(data, width, height)

    return {
      dominantColors: sortedColors,
      brightness: avgBrightness / 255,
      contrast,
      sharpness,
      aspectRatio: width / height,
      hasTransparency,
      objectBounds: minX < maxX ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : undefined,
    }
  }

  private calculateContrast(data: Uint8ClampedArray): number {
    let sum = 0
    let sumSquares = 0
    const pixelCount = data.length / 4

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      sum += brightness
      sumSquares += brightness * brightness
    }

    const mean = sum / pixelCount
    const variance = sumSquares / pixelCount - mean * mean
    return Math.sqrt(variance) / 255
  }

  private calculateSharpness(data: Uint8ClampedArray, width: number, height: number): number {
    let sharpness = 0
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0,
          gy = 0

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
            const kernelIdx = (ky + 1) * 3 + (kx + 1)
            gx += gray * sobelX[kernelIdx]
            gy += gray * sobelY[kernelIdx]
          }
        }

        sharpness += Math.sqrt(gx * gx + gy * gy)
      }
    }

    return sharpness / ((width - 2) * (height - 2) * 255)
  }

  async preprocessImage(file: File, targetSize = 1024): Promise<Blob> {
    if (!this.ensureCanvas()) {
      throw new Error("Canvas not available - client-side only")
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        if (!this.canvas || !this.ctx) {
          reject(new Error("Canvas not available"))
          return
        }

        // Calculate optimal dimensions
        const { width: newWidth, height: newHeight } = this.calculateOptimalSize(img.width, img.height, targetSize)

        this.canvas.width = newWidth
        this.canvas.height = newHeight

        // Clear with white background for better 3D generation
        this.ctx.fillStyle = "#FFFFFF"
        this.ctx.fillRect(0, 0, newWidth, newHeight)

        // Draw image with high quality scaling
        this.ctx.imageSmoothingEnabled = true
        this.ctx.imageSmoothingQuality = "high"
        this.ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Apply enhancement filters
        this.enhanceImage()

        this.canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to process image"))
          },
          "image/jpeg",
          0.95,
        )
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private calculateOptimalSize(width: number, height: number, targetSize: number) {
    const aspectRatio = width / height

    if (width > height) {
      return {
        width: targetSize,
        height: Math.round(targetSize / aspectRatio),
      }
    } else {
      return {
        width: Math.round(targetSize * aspectRatio),
        height: targetSize,
      }
    }
  }

  private enhanceImage() {
    if (!this.canvas || !this.ctx) return

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    // Apply contrast and brightness enhancement
    for (let i = 0; i < data.length; i += 4) {
      // Enhance contrast
      data[i] = this.clamp((data[i] - 128) * 1.2 + 128) // Red
      data[i + 1] = this.clamp((data[i + 1] - 128) * 1.2 + 128) // Green
      data[i + 2] = this.clamp((data[i + 2] - 128) * 1.2 + 128) // Blue
    }

    this.ctx.putImageData(imageData, 0, 0)
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(255, value))
  }
}
