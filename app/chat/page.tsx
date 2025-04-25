"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChat } from "@/hooks/use-chat"
import ChatMessage from "@/components/chat-message"
import { Send, Settings, Loader2, Database } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [vectorRatio, setVectorRatio] = useState(75)
  const [summaryLength, setSummaryLength] = useState("none")
  const [testingOpenAI, setTestingOpenAI] = useState(false)
  const [testingPinecone, setTestingPinecone] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Add the settings to the message metadata
    const metadata = {
      vectorRatio,
      summaryLength,
    }

    handleSubmit(e, metadata)
  }

  const handleTestOpenAIAPI = async () => {
    setTestingOpenAI(true)
    try {
      const response = await fetch("/api/test-connections?type=openai")
      const data = await response.json()

      if (data.openai && data.openai.success) {
        toast({
          title: "OpenAI API Test Successful",
          description: `OpenAI API is working. Response: "${data.openai.response}"`,
        })
      } else {
        throw new Error(data.openai?.error || "Unknown error occurred")
      }
    } catch (error: any) {
      console.error("Error testing OpenAI API:", error)
      toast({
        title: "OpenAI API Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setTestingOpenAI(false)
    }
  }

  const handleTestPineconeAPI = async () => {
    setTestingPinecone(true)
    try {
      const response = await fetch("/api/test-connections?type=pinecone")
      const data = await response.json()

      if (data.pinecone && data.pinecone.success) {
        toast({
          title: "Pinecone API Test Successful",
          description: `Pinecone API is working. Available indexes: ${data.pinecone.indexes.join(", ") || "none"}`,
        })
      } else {
        throw new Error(data.pinecone?.error || "Unknown error occurred")
      }
    } catch (error: any) {
      console.error("Error testing Pinecone API:", error)
      toast({
        title: "Pinecone API Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setTestingPinecone(false)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chat with Custom GPT</h1>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTestOpenAIAPI} disabled={testingOpenAI}>
            {testingOpenAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Test OpenAI
          </Button>

          <Button variant="outline" size="sm" onClick={handleTestPineconeAPI} disabled={testingPinecone}>
            {testingPinecone ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Test Pinecone
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Chat Settings</SheetTitle>
                <SheetDescription>Customize how your AI assistant responds</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <Label>
                    Vector Search vs Web Search: {vectorRatio}% / {100 - vectorRatio}%
                  </Label>
                  <Slider
                    value={[vectorRatio]}
                    onValueChange={(value) => setVectorRatio(value[0])}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Summary Length</Label>
                  <Select value={summaryLength} onValueChange={setSummaryLength}>
                    <SelectTrigger>
                      <SelectValue placeholder="No summarization" />
                    </SelectTrigger>
                    <SelectContent>
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

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-medium">Welcome to your Custom GPT</h3>
                <p className="text-muted-foreground">
                  Start chatting with your AI assistant powered by your custom knowledge base. Use the settings button
                  to adjust how the AI responds.
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

        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
