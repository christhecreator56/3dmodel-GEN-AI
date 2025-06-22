"use client"

import { useState, useEffect } from "react"
import ProgressBar from "./progress-bar"

interface StatusIndicatorProps {
  isLoading: boolean
  jobStatuses: Array<{ uuid: string; status: string }>
  startTime?: number
  estimatedDuration?: number
}

export default function StatusIndicator({
  isLoading,
  jobStatuses,
  startTime,
  estimatedDuration = 120, // Default 2 minutes
}: StatusIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isLoading || !startTime) {
      setTimeRemaining(null)
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedTime(elapsed)

      // Calculate remaining time based on progress
      const actualTasks = jobStatuses.length
      const totalTasks = actualTasks > 0 ? actualTasks + 1 : 0
      const completedJobTasks = jobStatuses.filter((job) => job.status === "Done").length
      const initialRequestComplete = actualTasks > 0 ? 1 : 0
      const completedTasks = completedJobTasks + initialRequestComplete

      if (totalTasks > 0 && completedTasks < totalTasks) {
        const progress = completedTasks / totalTasks
        const estimatedTotal = Math.max(estimatedDuration, elapsed / Math.max(progress, 0.1))
        const remaining = Math.max(0, Math.ceil(estimatedTotal - elapsed))
        setTimeRemaining(remaining)
      } else if (actualTasks === 0) {
        // Initial phase - estimate based on elapsed time
        const remaining = Math.max(0, estimatedDuration - elapsed)
        setTimeRemaining(remaining)
      } else {
        setTimeRemaining(0)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isLoading, startTime, jobStatuses, estimatedDuration])

  if (!isLoading) {
    return null
  }

  // Add one additional task to the total count
  const actualTasks = jobStatuses.length
  const totalTasks = actualTasks > 0 ? actualTasks + 1 : 0

  // Count the first task (initial request) as completed when we have job statuses
  const completedJobTasks = jobStatuses.filter((job) => job.status === "Done").length
  const initialRequestComplete = actualTasks > 0 ? 1 : 0
  const completedTasks = completedJobTasks + initialRequestComplete

  const showProgress = actualTasks > 0
  const isIndeterminate = actualTasks === 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  const getStatusMessage = () => {
    if (actualTasks === 0) {
      return "Initializing generation..."
    }

    const processingJobs = jobStatuses.filter((job) => job.status === "Processing").length
    const doneJobs = jobStatuses.filter((job) => job.status === "Done").length

    if (processingJobs > 0) {
      return `Processing model (${doneJobs + 1}/${totalTasks})`
    } else if (doneJobs === actualTasks) {
      return "Finalizing your 3D model..."
    } else {
      return "Preparing generation..."
    }
  }

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
      <div className="w-80 max-w-[90vw]">
        <ProgressBar totalTasks={totalTasks} completedTasks={completedTasks} isIndeterminate={isIndeterminate} />
      </div>

      <div className="text-center space-y-2">
        <p className="text-white font-mono text-sm tracking-normal">{getStatusMessage()}</p>

        {timeRemaining !== null && (
          <div className="space-y-1">
            <p className="text-gray-300 text-sm tracking-normal">
              Estimated time remaining: <span className="text-white font-semibold">{formatTime(timeRemaining)}</span>
            </p>
            <p className="text-gray-400 text-xs tracking-normal">Elapsed: {formatTime(elapsedTime)}</p>
          </div>
        )}

        {actualTasks > 0 && (
          <p className="text-gray-400 text-xs tracking-normal">
            Step {Math.min(completedTasks + 1, totalTasks)} of {totalTasks}
          </p>
        )}
      </div>
    </div>
  )
}
