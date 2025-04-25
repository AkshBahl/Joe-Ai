"use client"

import { cn } from "@/lib/utils"
import type { Message } from "ai"
import { User, Bot, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [isStreaming, setIsStreaming] = useState(message.role === "assistant" && message.content === "")

  useEffect(() => {
    // If this is an assistant message that's being streamed (empty content initially)
    if (message.role === "assistant") {
      setIsStreaming(message.content === "")
    }
  }, [message.content, message.role])

  return (
    <div
      className={cn("flex items-start gap-4 p-4 rounded-lg", message.role === "user" ? "bg-muted/50" : "bg-primary/5")}
    >
      <div className="flex-shrink-0">
        {message.role === "user" ? (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="font-medium">{message.role === "user" ? "You" : "AI Assistant"}</div>
        <div className="prose prose-sm max-w-none">
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
  )
}
