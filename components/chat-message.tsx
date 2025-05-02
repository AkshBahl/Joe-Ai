"use client"

import { cn } from "@/lib/utils"
import type { Message } from "ai"
import { User, Bot, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

interface ChatMessageProps {
  message: Message
  onVoiceInput?: (text: string) => void
}

export default function ChatMessage({ message, onVoiceInput }: ChatMessageProps) {
  const [isStreaming, setIsStreaming] = useState(message.role === "assistant" && message.content === "")
  const [isListening, setIsListening] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (message.role === "assistant") {
      setIsStreaming(message.content === "")
    }
  }, [message.content, message.role])

  const isUser = message.role === "user"

  const startListening = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')

      if (onVoiceInput) {
        onVoiceInput(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const stopListening = () => {
    setIsListening(false)
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-lg p-4 flex gap-4 items-start",
          isUser
            ? "bg-primary/10 text-primary dark:bg-primary/80 dark:text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
          {isUser ? (
            <User className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1">
          <div className="font-medium mb-1">
            {isUser ? "You" : "Joseph Malchar"}
          </div>

          <div className="text-sm">
            {isStreaming ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating response...</span>
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
