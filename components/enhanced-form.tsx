"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type * as z from "zod"
import { Form as UIForm } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { ImageIcon, SlidersHorizontal, ArrowUp, Sparkles } from "lucide-react"
import AutoResizeTextarea from "./auto-resize-textarea"
import ImageUploadArea from "./image-upload-area"
import { formSchema } from "@/lib/form-schema"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { ImageProcessor, type ImageAnalysis } from "@/lib/image-processor"
import { PromptEnhancer } from "@/lib/prompt-enhancer"

interface EnhancedFormProps {
  isLoading: boolean
  onSubmit: (values: z.infer<typeof formSchema>, enhancedData?: any) => Promise<void>
  onOpenOptions: () => void
  options: any
}

export default function EnhancedForm({ isLoading, onSubmit, onOpenOptions, options }: EnhancedFormProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [imageAnalyses, setImageAnalyses] = useState<ImageAnalysis[]>([])
  const [enhancedPromptPreview, setEnhancedPromptPreview] = useState<string>("")
  const [isClient, setIsClient] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const dragCounter = useRef(0)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const imageProcessorRef = useRef<ImageProcessor | null>(null)
  const promptEnhancerRef = useRef<PromptEnhancer | null>(null)

  // Initialize client-side only components
  useEffect(() => {
    setIsClient(true)
    imageProcessorRef.current = new ImageProcessor()
    promptEnhancerRef.current = new PromptEnhancer()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      images: [],
      condition_mode: "concat",
      quality: "medium",
      geometry_file_format: "glb",
      use_hyper: false,
      tier: "Regular",
      TAPose: false,
      material: "PBR",
    },
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await addImages(files)
  }

  const addImages = async (files: File[]) => {
    if (files.length === 0 || !isClient || !imageProcessorRef.current) return

    setIsProcessingImages(true)
    setError(null)

    try {
      // Limit to 5 images total
      const currentImages = form.getValues("images") || []
      const totalImages = currentImages.length + files.length

      if (totalImages > 5) {
        setError("You can upload a maximum of 5 images")
        const allowedNewImages = 5 - currentImages.length
        files = files.slice(0, allowedNewImages)
        if (files.length === 0) return
      }

      // Process images in parallel
      const processedResults = await Promise.all(
        files.map(async (file) => {
          try {
            if (!imageProcessorRef.current) {
              throw new Error("Image processor not available")
            }

            // Analyze original image
            const analysis = await imageProcessorRef.current.analyzeImage(file)

            // Preprocess image for better 3D generation
            const processedBlob = await imageProcessorRef.current.preprocessImage(file, 1024)
            const processedFile = new File([processedBlob], file.name, { type: "image/jpeg" })

            // Create preview URL
            const previewUrl = URL.createObjectURL(processedFile)

            return {
              file: processedFile,
              previewUrl,
              analysis,
            }
          } catch (err) {
            console.error(`Failed to process image ${file.name}:`, err)
            throw new Error(`Failed to process ${file.name}`)
          }
        }),
      )

      // Update state with processed results
      const newPreviewUrls = processedResults.map((result) => result.previewUrl)
      const newFiles = processedResults.map((result) => result.file)
      const newAnalyses = processedResults.map((result) => result.analysis)

      const updatedImages = [...currentImages, ...newFiles]
      const updatedAnalyses = [...imageAnalyses, ...newAnalyses]

      setPreviewUrls([...previewUrls, ...newPreviewUrls])
      setImageAnalyses(updatedAnalyses)
      form.setValue("images", updatedImages)

      // Update enhanced prompt preview
      updateEnhancedPromptPreview(form.getValues("prompt"), updatedAnalyses)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process images")
    } finally {
      setIsProcessingImages(false)
    }
  }

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || []
    const newImages = [...currentImages]
    newImages.splice(index, 1)

    const newPreviewUrls = [...previewUrls]
    URL.revokeObjectURL(newPreviewUrls[index])
    newPreviewUrls.splice(index, 1)

    const newAnalyses = [...imageAnalyses]
    newAnalyses.splice(index, 1)

    setPreviewUrls(newPreviewUrls)
    setImageAnalyses(newAnalyses)
    form.setValue("images", newImages)

    // Update enhanced prompt preview
    updateEnhancedPromptPreview(form.getValues("prompt"), newAnalyses)
  }

  const updateEnhancedPromptPreview = useCallback(
    (prompt: string, analyses: ImageAnalysis[]) => {
      if (!isClient || !promptEnhancerRef.current) return

      if (prompt.trim() || analyses.length > 0) {
        const enhanced = promptEnhancerRef.current.enhancePrompt(prompt || "3D model", analyses, options)
        setEnhancedPromptPreview(enhanced.enhancedPrompt)
      } else {
        setEnhancedPromptPreview("")
      }
    },
    [options, isClient],
  )

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    form.setValue("prompt", value)
    updateEnhancedPromptPreview(value, imageAnalyses)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
      await addImages(files)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (!isMobile && !e.shiftKey) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
  }

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isClient || !promptEnhancerRef.current) {
      // Fallback to basic submission if client-side processing isn't available
      await onSubmit(values)
      return
    }

    // Generate enhanced prompt data
    const enhancedData = promptEnhancerRef.current.enhancePrompt(values.prompt || "3D model", imageAnalyses, options)

    // Pass enhanced data to parent
    await onSubmit(values, {
      enhancedPrompt: enhancedData,
      imageAnalyses,
      processingMetadata: {
        totalImages: imageAnalyses.length,
        averageBrightness: imageAnalyses.reduce((sum, a) => sum + a.brightness, 0) / imageAnalyses.length || 0,
        averageContrast: imageAnalyses.reduce((sum, a) => sum + a.contrast, 0) / imageAnalyses.length || 0,
        hasTransparency: imageAnalyses.some((a) => a.hasTransparency),
      },
    })
  }

  // Don't render image processing features during SSR
  if (!isClient) {
    return (
      <UIForm {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="relative">
          <div className="relative bg-black/60 backdrop-blur-md rounded-[24px] overflow-hidden transition-all shadow-lg border border-[rgba(255,255,255,0.12)]">
            <div className="px-2 py-1.5">
              <div className="flex items-center">
                <div className="flex space-x-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onOpenOptions}
                    className="text-gray-400 hover:text-white hover:bg-transparent rounded-full h-10 w-10 ml-0"
                    disabled={isLoading}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                <AutoResizeTextarea
                  placeholder="Generate 3D model..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-400 py-2 px-3 resize-none text-base tracking-normal"
                  {...form.register("prompt")}
                  disabled={isLoading}
                />

                <div>
                  <Button
                    type="submit"
                    className="bg-white hover:bg-gray-200 text-black rounded-full h-10 w-10 p-0 flex items-center justify-center"
                    disabled={isLoading}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </UIForm>
    )
  }

  return (
    <UIForm {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="relative">
        <div
          ref={dropAreaRef}
          className={cn(
            "relative bg-black/60 backdrop-blur-md rounded-[24px] overflow-hidden transition-all shadow-lg border border-[rgba(255,255,255,0.12)]",
            isDragging ? "ring-2 ring-white" : isFocused ? "ring-2 ring-white" : "",
            (isLoading || isProcessingImages) && "animate-pulse-loading pointer-events-none opacity-70",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Image previews */}
          <ImageUploadArea
            previewUrls={previewUrls}
            onRemoveImage={removeImage}
            isLoading={isLoading || isProcessingImages}
          />

          {/* Enhanced prompt preview */}
          {enhancedPromptPreview && !isLoading && (
            <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.1)]">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Enhanced prompt preview:</p>
                  <p className="text-xs text-gray-300 line-clamp-2">{enhancedPromptPreview}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-2 py-1.5">
            <div className="flex items-center">
              <div className="flex space-x-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isLoading || isProcessingImages}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={triggerFileInput}
                  className={cn(
                    "text-gray-400 hover:text-white hover:bg-transparent rounded-full h-10 w-10 ml-0",
                    isProcessingImages && "animate-pulse",
                  )}
                  disabled={isLoading || isProcessingImages}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onOpenOptions}
                  className="text-gray-400 hover:text-white hover:bg-transparent rounded-full h-10 w-10 ml-0"
                  disabled={isLoading || isProcessingImages}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </div>

              <AutoResizeTextarea
                placeholder="Generate 3D model..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-400 py-2 px-3 resize-none text-base tracking-normal"
                {...form.register("prompt")}
                onChange={handlePromptChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isProcessingImages}
              />

              <div>
                <Button
                  type="submit"
                  className="bg-white hover:bg-gray-200 text-black rounded-full h-10 w-10 p-0 flex items-center justify-center"
                  disabled={isLoading || isProcessingImages}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {isDragging && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-none z-10">
              <p className="text-white font-medium tracking-normal text-lg">Drop images here</p>
            </div>
          )}

          {isProcessingImages && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-2 text-white">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <p className="text-sm">Processing images...</p>
              </div>
            </div>
          )}
        </div>

        {error && <div className="mt-2 text-red-400 text-sm tracking-normal">{error}</div>}

        {isProcessingImages && (
          <div className="mt-2 text-yellow-400 text-sm tracking-normal">
            Analyzing and optimizing images for better 3D generation...
          </div>
        )}
      </form>
    </UIForm>
  )
}
