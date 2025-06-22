"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Download, ArrowLeft, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import type { FormValues } from "@/lib/form-schema"
import { submitRodinJob, checkJobStatus, downloadModel } from "@/lib/api-service"
import ModelViewer from "./model-viewer"
import EnhancedForm from "./enhanced-form"
import StatusIndicator from "./status-indicator"
import OptionsDialog from "./options-dialog"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function Rodin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [jobStatuses, setJobStatuses] = useState<Array<{ uuid: string; status: string }>>([])
  const [showOptions, setShowOptions] = useState(false)
  const [showPromptContainer, setShowPromptContainer] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const [options, setOptions] = useState({
    condition_mode: "concat" as const,
    quality: "medium" as const,
    geometry_file_format: "glb" as const,
    use_hyper: false,
    tier: "Regular" as const,
    TAPose: false,
    material: "PBR" as const,
  })
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  // Prevent body scroll on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"

      return () => {
        document.body.style.overflow = ""
        document.documentElement.style.overflow = ""
      }
    }
  }, [isMobile])

  const handleOptionsChange = (newOptions: any) => {
    setOptions(newOptions)
  }

  const handleHomeClick = () => {
    router.push("/")
  }

  async function handleStatusCheck(subscriptionKey: string, taskUuid: string) {
    try {
      setIsPolling(true)

      const data = await checkJobStatus(subscriptionKey)
      console.log("Status response:", data)

      // Check if jobs array exists
      if (!data.jobs || !Array.isArray(data.jobs) || data.jobs.length === 0) {
        throw new Error("No jobs found in status response")
      }

      // Update job statuses
      setJobStatuses(data.jobs)

      // Check status of all jobs
      const allJobsDone = data.jobs.every((job: any) => job.status === "Done")
      const anyJobFailed = data.jobs.some((job: any) => job.status === "Failed")

      if (allJobsDone) {
        setIsPolling(false)

        // Get the download URL using the task UUID
        try {
          const downloadData = await downloadModel(taskUuid)
          console.log("Download response:", downloadData)

          // Check if there's an error in the download response
          if (downloadData.error && downloadData.error !== "OK") {
            throw new Error(`Download error: ${downloadData.error}`)
          }

          // Find the first GLB file to display in the 3D viewer
          if (downloadData.list && downloadData.list.length > 0) {
            const glbFile = downloadData.list.find((file: { name: string }) => file.name.toLowerCase().endsWith(".glb"))

            if (glbFile) {
              const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(glbFile.url)}`
              setModelUrl(proxyUrl)
              setDownloadUrl(glbFile.url)
              setIsLoading(false)
              setGenerationStartTime(null)
              setShowPromptContainer(false)
            } else {
              setError("No GLB file found in the results")
              setIsLoading(false)
              setGenerationStartTime(null)
            }
          } else {
            setError("No files available for download")
            setIsLoading(false)
            setGenerationStartTime(null)
          }
        } catch (downloadErr) {
          setError(`Failed to download model: ${downloadErr instanceof Error ? downloadErr.message : "Unknown error"}`)
          setIsLoading(false)
          setGenerationStartTime(null)
        }
      } else if (anyJobFailed) {
        setIsPolling(false)
        setError("Generation task failed")
        setIsLoading(false)
        setGenerationStartTime(null)
      } else {
        // Still processing, poll again after a delay
        setTimeout(() => handleStatusCheck(subscriptionKey, taskUuid), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check status")
      setIsPolling(false)
      setIsLoading(false)
      setGenerationStartTime(null)
    }
  }

  async function handleSubmit(values: FormValues, enhancedData?: any) {
    setIsLoading(true)
    setGenerationStartTime(Date.now())
    setError(null)
    setResult(null)
    setModelUrl(null)
    setDownloadUrl(null)
    setJobStatuses([])

    try {
      const formData = new FormData()

      if (values.images && values.images.length > 0) {
        values.images.forEach((image) => {
          formData.append("images", image)
        })
      }

      // Use enhanced prompt if available
      const promptToUse = enhancedData?.enhancedPrompt?.enhancedPrompt || values.prompt
      if (promptToUse) {
        formData.append("prompt", promptToUse)
      }

      // Add all the advanced options with enhanced precision
      formData.append("condition_mode", options.condition_mode)
      formData.append("geometry_file_format", options.geometry_file_format)
      formData.append("material", options.material)
      formData.append("quality", options.quality)
      formData.append("use_hyper", options.use_hyper.toString())
      formData.append("tier", options.tier)
      formData.append("TAPose", options.TAPose.toString())

      // Enhanced mesh processing parameters
      formData.append("mesh_mode", "Quad")
      formData.append("mesh_simplify", "true")
      formData.append("mesh_smooth", "true")
      formData.append(
        "texture_resolution",
        options.quality === "high" ? "2048" : options.quality === "medium" ? "1024" : "512",
      )

      // Add precision parameters based on image analysis
      if (enhancedData?.processingMetadata) {
        const metadata = enhancedData.processingMetadata

        // Adjust parameters based on image characteristics
        if (metadata.averageContrast > 0.5) {
          formData.append("edge_enhancement", "true")
        }

        if (metadata.hasTransparency) {
          formData.append("preserve_transparency", "true")
        }

        // Set detail level based on image quality
        const detailLevel = metadata.averageBrightness > 0.7 ? "high" : "medium"
        formData.append("detail_level", detailLevel)
      }

      console.log("Submitting enhanced generation request with prompt:", promptToUse)

      // Make the API call through our server route
      const data = await submitRodinJob(formData)
      console.log("Generation response:", data)

      setResult(data)

      // Start polling for status
      if (data.jobs && data.jobs.subscription_key && data.uuid) {
        handleStatusCheck(data.jobs.subscription_key, data.uuid)
      } else {
        setError("Missing required data for status checking")
        setIsLoading(false)
        setGenerationStartTime(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setIsLoading(false)
      setGenerationStartTime(null)
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank")
    }
  }

  const handleBack = () => {
    setShowPromptContainer(true)
  }

  const ExternalLinks = () => (
    <div className="flex items-center gap-4">
      <Button
        onClick={handleHomeClick}
        variant="ghost"
        size="sm"
        className="text-white hover:text-gray-300 hover:bg-white/10"
      >
        <Home className="h-4 w-4 mr-2" />
        <span className="tracking-normal">Home</span>
      </Button>
      <a
        href="https://hyperhuman.deemos.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-white hover:text-gray-300 text-sm"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="tracking-normal">Hyper3D</span>
      </a>
    </div>
  )

  return (
    <div className="relative h-[100dvh] w-full">
      {/* Full-screen canvas */}
      <div className="absolute inset-0 z-0">
        <ModelViewer modelUrl={isLoading ? null : modelUrl} />
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Logo in top left */}
        <div className="absolute top-6 left-6 pointer-events-auto">
          <h1 className="text-3xl text-white font-normal tracking-normal">3D Model Generator</h1>
          <p className="text-gray-400 text-sm mt-1 tracking-normal">Powered by Hyper3D Rodin</p>
        </div>

        {/* Links in top right - desktop only */}
        {!isMobile && (
          <div className="absolute top-6 right-6 pointer-events-auto">
            <ExternalLinks />
          </div>
        )}

        {/* Loading indicator */}
        <StatusIndicator
          isLoading={isLoading}
          jobStatuses={jobStatuses}
          startTime={generationStartTime}
          estimatedDuration={
            options.use_hyper
              ? options.quality === "high"
                ? 240
                : options.quality === "medium"
                  ? 180
                  : 120
              : options.quality === "high"
                ? 180
                : options.quality === "medium"
                  ? 120
                  : 90
          }
        />

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-900/80 text-white px-4 py-2 rounded-md tracking-normal max-w-md text-center">
            {error}
          </div>
        )}

        {/* Model controls when model is loaded */}
        {!isLoading && modelUrl && !showPromptContainer && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
            <Button
              onClick={handleBack}
              className="bg-black hover:bg-gray-900 text-white border border-white/20 rounded-full px-4 py-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="tracking-normal">Back</span>
            </Button>

            <Button
              onClick={handleDownload}
              className="bg-white hover:bg-gray-200 text-black rounded-full px-4 py-2 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="tracking-normal">Download</span>
            </Button>
          </div>
        )}

        {/* Input field at bottom */}
        {showPromptContainer && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 sm:px-0 pointer-events-auto">
            <EnhancedForm
              isLoading={isLoading}
              onSubmit={handleSubmit}
              onOpenOptions={() => setShowOptions(true)}
              options={options}
            />

            {/* Links below prompt on mobile */}
            {isMobile && (
              <div className="mt-4 flex justify-center pointer-events-auto">
                <ExternalLinks />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Options Dialog/Drawer */}
      <OptionsDialog
        open={showOptions}
        onOpenChange={setShowOptions}
        options={options}
        onOptionsChange={handleOptionsChange}
      />
    </div>
  )
}
