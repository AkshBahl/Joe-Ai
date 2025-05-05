"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChat } from "@/hooks/use-chat"
import ChatMessage from "@/components/chat-message"
import { Send, Loader2, Mic, MicOff, Sun, Moon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import StreamingAvatarComponent from "@/components/streaming-avatar"

// Define TaskType if not already defined in the StreamingAvatar package
enum TaskType {
  REPEAT = "repeat",
}

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const { toast } = useToast()
  const avatarRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleAvatarReady = (avatarInstance: any) => {
    avatarRef.current = avatarInstance
    toast({
      title: "Avatar Ready",
      description: "The virtual assistant is now ready to interact with you.",
    })
  }

  const stopCurrentSpeech = async () => {
    if (avatarRef.current && isSpeaking) {
      try {
        await avatarRef.current.stopSpeaking()
        setIsSpeaking(false)
      } catch (error) {
        console.error("Error stopping speech:", error)
      }
    }
  }

  // Effect to speak the latest assistant message when it arrives
  const speakLatestMessage = async () => {
    // Find the last assistant message
    const assistantMessages = messages.filter((m) => m.role === "assistant" && m.content.trim() !== "")
    const lastMessage = assistantMessages[assistantMessages.length - 1]

    if (lastMessage && lastMessage.id !== lastSpokenMessageId && avatarRef.current && !isLoading) {
      try {
        // If already speaking, stop the current speech
        if (isSpeaking) {
          await stopCurrentSpeech()
        }

        setIsSpeaking(true)
        setLastSpokenMessageId(lastMessage.id)

        await avatarRef.current.speak({
          text: lastMessage.content,
          taskType: TaskType.REPEAT,
        })
      } catch (error) {
        console.error("Error making avatar speak:", error)
        toast({
          title: "Speech Error",
          description: "There was an error making the avatar speak.",
          variant: "destructive",
        })
      } finally {
        setIsSpeaking(false)
      }
    }
  }

  useEffect(() => {
    if (!isLoading) {
      speakLatestMessage()
    }
  }, [messages, isLoading, lastSpokenMessageId, toast])

  // Speech-to-text logic
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      })
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join("")

      handleInputChange({ target: { value: transcript } } as any)
    }

    recognition.onerror = () => {
      setIsListening(false)
      toast({
        title: "Speech Recognition Error",
        description: "An error occurred with speech recognition.",
        variant: "destructive",
      })
    }

    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  const stopListening = () => setIsListening(false)

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <nav className="w-full flex items-center justify-between px-4 py-2 sm:px-8 sm:py-4 border-b border-gray-300 dark:border-gray-700 bg-background">
        <div className="flex items-center">
          <img
            src="/dark.webp"
            alt="Logo"
            className="h-8 w-auto sm:h-10 max-w-[120px] object-contain mr-2"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
          />
        
        </div>
       
      </nav>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Panel - Avatar */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-background h-48 sm:h-64 md:h-full min-h-[180px] max-h-[400px] md:max-h-none p-4">
          <StreamingAvatarComponent onReady={handleAvatarReady} isSpeaking={isSpeaking} />
        </div>

        {/* Right Panel - Chat UI */}
        <div className="w-full md:w-1/2 flex flex-col p-2 sm:p-4 overflow-hidden bg-background text-foreground h-full">
          <Card className="flex-1 overflow-hidden flex flex-col border border-gray-300 dark:border-gray-700 bg-background text-foreground">
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-4">
                  <div className="max-w-sm space-y-2">
                    <h3 className="text-sm font-medium">Welcome to Joe AI</h3>
                    <p className="text-xs text-muted-foreground">
                      Start chatting with your assistant powered by your custom knowledge base.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </>
              )}
            </CardContent>

            <div className="p-2 border-t border-gray-300 dark:border-gray-700 bg-background">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  disabled={isLoading || isSpeaking}
                  className="flex-1 text-xs text-foreground border border-gray-300 dark:border-gray-700 placeholder-muted-foreground bg-background"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim() || isSpeaking}
                  size="sm"
                  className="text-background bg-foreground"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading || isSpeaking}
                  className="text-foreground bg-muted"
                  title={isListening ? "Stop voice typing" : "Start voice typing"}
                >
                  {isListening ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
