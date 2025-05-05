"use client"
import { useEffect, useRef, useState } from "react"
import StreamingAvatar, { AvatarQuality, StreamingEvents } from "@heygen/streaming-avatar"

interface StreamingAvatarProps {
  onReady: (avatarInstance: any) => void
  isSpeaking: boolean
}

export default function StreamingAvatarComponent({ onReady, isSpeaking }: StreamingAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchAccessToken = async (): Promise<string> => {
    const response = await fetch("/api/heygen-token")
    const { token } = await response.json()
    return token
  }

  const initialize = async () => {
    if (isInitialized || isLoading) return

    try {
      setIsLoading(true)
      const token = await fetchAccessToken()
      const avatarInstance = new StreamingAvatar({ token })
      setAvatar(avatarInstance)

      avatarInstance.on(StreamingEvents.STREAM_READY, (event) => {
        if (event.detail && videoRef.current) {
          videoRef.current.srcObject = event.detail
          videoRef.current.play()
        }
      })

      avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        if (videoRef.current) videoRef.current.srcObject = null
      })

      await avatarInstance.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID!,
        language: "English",
      })

      setIsInitialized(true)
      onReady(avatarInstance)
    } catch (error) {
      console.error("Failed to initialize avatar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initialize()

    return () => {
      if (avatar) {
        avatar.disconnect()
      }
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="rounded-xl border shadow-md w-full h-full max-h-[400px] bg-black object-cover"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
            <p className="text-white text-sm">Initializing avatar...</p>
          </div>
        </div>
      )}

      {!isInitialized && !isLoading && (
        <button
          onClick={initialize}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded absolute bottom-4 transition-colors"
        >
          Start Avatar
        </button>
      )}

      {isSpeaking && isInitialized && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <span className="animate-pulse relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          Speaking
        </div>
      )}
    </div>
  )
}
