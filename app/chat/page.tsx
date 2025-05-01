"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useChat } from "@/hooks/use-chat"
import ChatMessage from "@/components/chat-message"
import {
  Send,
  Settings,
  Loader2,
  Mic,
  MicOff,
  Sun,
  Moon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [vectorRatio, setVectorRatio] = useState(75)
  const [summaryLength, setSummaryLength] = useState("none")
  const [testingOpenAI, setTestingOpenAI] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const metadata = { vectorRatio, summaryLength }
    handleSubmit(e, metadata)
  }

  const handleTestOpenAIAPI = async () => {
    setTestingOpenAI(true)
    try {
      const response = await fetch("/api/test-connections?type=openai")
      const data = await response.json()
      if (data.openai?.success) {
        toast({
          title: "OpenAI API Test Successful",
          description: `OpenAI API is working. Assistant: ${data.openai.assistant.name} (${data.openai.assistant.model})`,
        })
      } else {
        throw new Error(data.openai?.error || "Unknown error occurred")
      }
    } catch (error: any) {
      toast({
        title: "OpenAI API Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setTestingOpenAI(false)
    }
  }

  // Speech-to-text logic
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.')
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
        .join('')
      handleInputChange({ target: { value: transcript } } as any)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }
  const stopListening = () => setIsListening(false)

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      {/* Left Panel - Image */}
      <div className="w-3/4 flex items-center justify-center bg-background">
        <img
          src="/joe-avatar.png"
          alt="Joe Avatar"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Right Panel - Chat UI */}
      <div className="w-1/2 flex flex-col p-4 overflow-hidden bg-background text-foreground">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestOpenAIAPI}
            disabled={testingOpenAI}
            className="text-foreground bg-muted"
          >
            {testingOpenAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Test OpenAI
          </Button>

          <div className="flex gap-2 items-center">
            {/* Theme toggle button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-foreground bg-muted"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {/* Settings button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground bg-muted">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-background text-foreground">
                <SheetHeader>
                  <SheetTitle>Chat Settings</SheetTitle>
                  <SheetDescription>Customize how your AI assistant responds</SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <div className="space-y-2">
                    <Label>Summary Length</Label>
                    <Select value={summaryLength} onValueChange={setSummaryLength}>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="No summarization" />
                      </SelectTrigger>
                      <SelectContent className="bg-background text-foreground">
                        <SelectItem value="none">No summarization</SelectItem>
                        <SelectItem value="100">100 words</SelectItem>
                        <SelectItem value="200">200 words</SelectItem>
                        <SelectItem value="300">300 words</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

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
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          <div className="p-2 border-t border-gray-300 dark:border-gray-700 bg-background">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              {/* Mic button for speech-to-text */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                className="text-foreground bg-muted"
              >
                {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 text-xs text-foreground border border-gray-300 dark:border-gray-700 placeholder-muted-foreground bg-background"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="sm"
                className="text-background bg-foreground"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
