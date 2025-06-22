import type { ImageAnalysis } from "./image-processor"

export interface EnhancedPromptData {
  basePrompt: string
  enhancedPrompt: string
  technicalSpecs: string[]
  qualityModifiers: string[]
}

export class PromptEnhancer {
  private readonly QUALITY_MODIFIERS = {
    high: [
      "highly detailed",
      "photorealistic",
      "professional quality",
      "sharp edges",
      "clean topology",
      "optimized mesh",
      "accurate proportions",
      "fine surface details",
    ],
    medium: ["detailed", "good quality", "clean geometry", "proper proportions", "smooth surfaces"],
    low: ["simplified", "basic geometry", "clean shapes"],
  }

  private readonly TECHNICAL_SPECS = {
    pbr: ["PBR materials", "realistic lighting", "proper metallic and roughness maps", "accurate surface properties"],
    shaded: ["stylized shading", "artistic materials", "enhanced visual appeal"],
  }

  enhancePrompt(
    originalPrompt: string,
    imageAnalyses: ImageAnalysis[],
    options: {
      quality: string
      material: string
      use_hyper: boolean
      tier: string
      condition_mode: string
    },
  ): EnhancedPromptData {
    const basePrompt = originalPrompt.trim()

    // Analyze images to enhance prompt
    const imageContext = this.analyzeImageContext(imageAnalyses)

    // Build enhanced prompt
    let enhancedPrompt = basePrompt

    // Add image-based context
    if (imageContext.length > 0) {
      enhancedPrompt += `. Based on reference images: ${imageContext.join(", ")}`
    }

    // Add quality modifiers
    const qualityMods =
      this.QUALITY_MODIFIERS[options.quality as keyof typeof this.QUALITY_MODIFIERS] || this.QUALITY_MODIFIERS.medium
    enhancedPrompt += `. Create with ${qualityMods.slice(0, 3).join(", ")}`

    // Add technical specifications
    const techSpecs =
      this.TECHNICAL_SPECS[options.material.toLowerCase() as keyof typeof this.TECHNICAL_SPECS] ||
      this.TECHNICAL_SPECS.pbr

    // Add precision modifiers based on settings
    const precisionModifiers = this.getPrecisionModifiers(options)
    enhancedPrompt += `. ${precisionModifiers.join(", ")}`

    // Add geometry-specific instructions
    const geometryInstructions = this.getGeometryInstructions(options, imageAnalyses)
    if (geometryInstructions) {
      enhancedPrompt += `. ${geometryInstructions}`
    }

    return {
      basePrompt,
      enhancedPrompt,
      technicalSpecs: techSpecs,
      qualityModifiers: qualityMods,
    }
  }

  private analyzeImageContext(imageAnalyses: ImageAnalysis[]): string[] {
    const context: string[] = []

    imageAnalyses.forEach((analysis, index) => {
      // Analyze lighting conditions
      if (analysis.brightness > 0.7) {
        context.push("bright lighting")
      } else if (analysis.brightness < 0.3) {
        context.push("dramatic shadows")
      }

      // Analyze contrast
      if (analysis.contrast > 0.5) {
        context.push("high contrast details")
      }

      // Analyze sharpness
      if (analysis.sharpness > 0.3) {
        context.push("sharp detailed features")
      }

      // Analyze aspect ratio for object type hints
      if (analysis.aspectRatio > 1.5) {
        context.push("elongated proportions")
      } else if (analysis.aspectRatio < 0.7) {
        context.push("tall proportions")
      }

      // Analyze dominant colors
      if (analysis.dominantColors.length > 0) {
        const colorDescriptions = this.getColorDescriptions(analysis.dominantColors)
        if (colorDescriptions.length > 0) {
          context.push(`${colorDescriptions.join(" and ")} color scheme`)
        }
      }

      // Object bounds analysis
      if (analysis.objectBounds) {
        const bounds = analysis.objectBounds
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2

        // Determine object positioning
        if (centerY < bounds.height * 0.3) {
          context.push("object positioned in upper area")
        } else if (centerY > bounds.height * 0.7) {
          context.push("object positioned in lower area")
        }
      }
    })

    return [...new Set(context)] // Remove duplicates
  }

  private getColorDescriptions(colors: string[]): string[] {
    const descriptions: string[] = []

    colors.slice(0, 2).forEach((color) => {
      // Parse RGB values (simplified)
      const match = color.match(/rgb$$(\d+),(\d+),(\d+)$$/)
      if (match) {
        const [, r, g, b] = match.map(Number)

        if (r > 200 && g > 200 && b > 200) {
          descriptions.push("bright")
        } else if (r < 50 && g < 50 && b < 50) {
          descriptions.push("dark")
        } else if (r > g && r > b) {
          descriptions.push("warm red tones")
        } else if (g > r && g > b) {
          descriptions.push("natural green tones")
        } else if (b > r && b > g) {
          descriptions.push("cool blue tones")
        }
      }
    })

    return descriptions
  }

  private getPrecisionModifiers(options: any): string[] {
    const modifiers: string[] = []

    if (options.use_hyper) {
      modifiers.push("ultra-high precision geometry")
      modifiers.push("enhanced surface detail capture")
      modifiers.push("advanced mesh optimization")
    }

    if (options.tier === "Regular") {
      modifiers.push("production-quality topology")
      modifiers.push("accurate dimensional scaling")
    } else {
      modifiers.push("rapid prototyping optimized")
    }

    if (options.condition_mode === "fuse") {
      modifiers.push("seamlessly integrated multiple elements")
      modifiers.push("unified object composition")
    } else {
      modifiers.push("consistent multi-view reconstruction")
      modifiers.push("accurate perspective correlation")
    }

    return modifiers
  }

  private getGeometryInstructions(options: any, imageAnalyses: ImageAnalysis[]): string {
    const instructions: string[] = []

    // Quality-based geometry instructions
    switch (options.quality) {
      case "high":
        instructions.push("Generate high-resolution mesh with 50k+ vertices")
        instructions.push("Preserve fine surface details and edge definition")
        break
      case "medium":
        instructions.push("Create balanced mesh with 18k vertices for optimal detail-to-performance ratio")
        break
      case "low":
        instructions.push("Generate optimized low-poly mesh maintaining essential shape characteristics")
        break
    }

    // Material-specific instructions
    if (options.material === "PBR") {
      instructions.push("Include proper UV mapping for PBR texture application")
      instructions.push("Ensure surface normals are correctly oriented for realistic lighting")
    }

    // Image-based geometry hints
    const hasHighDetail = imageAnalyses.some((analysis) => analysis.sharpness > 0.4)
    if (hasHighDetail) {
      instructions.push("Capture intricate surface patterns and texture details visible in reference images")
    }

    const hasTransparency = imageAnalyses.some((analysis) => analysis.hasTransparency)
    if (hasTransparency) {
      instructions.push("Handle transparent and semi-transparent regions appropriately")
    }

    return instructions.join(". ")
  }
}
