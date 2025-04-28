"use client"

import type React from "react"
import { useState, useCallback } from "react"
import type { Message } from "ai"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>, metadata?: any) => {
      e.preventDefault()

      if (!input.trim()) return

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setIsLoading(true)

      // Create a new assistant message placeholder
      const assistantMessageId = uuidv4()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ])

      try {
        // Use the API route to generate a response
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            vectorRatio: metadata?.vectorRatio ,
            summaryLength: metadata?.summaryLength || "none",
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || `Error: ${response.status}`)
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No reader available")
        }

        let accumulatedText = ""
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Convert the chunk to text
          const chunk = decoder.decode(value, { stream: true })
          accumulatedText += chunk

          // Update the assistant message with the accumulated text
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: accumulatedText } : m
            )
          )
        }
      } catch (error: any) {
        console.error("Error sending message:", error)

        // Remove the empty assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))

        // Add an error message from the assistant
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: "assistant",
            content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          },
        ])

        toast({
          title: "Error",
          description: error.message || "Failed to send message. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [input, messages, toast],
  )

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  }
}
