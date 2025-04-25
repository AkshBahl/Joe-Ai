import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Database, MessageSquare } from "lucide-react"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8 text-center">Custom GPT Platform</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link href="/chat" className="block">
          <Card className="h-full transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Chat Interface
              </CardTitle>
              <CardDescription>Chat with your custom GPT and use filters for different response types</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Interact with your AI assistant powered by your custom knowledge base. Adjust vector vs web search ratio
                and control response length.
              </p>
              <Button className="mt-4 w-full">Start Chatting</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/knowledge-base" className="block">
          <Card className="h-full transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6" />
                Knowledge Base
              </CardTitle>
              <CardDescription>Upload and manage your custom knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Upload documents to train your custom GPT. Manage your knowledge base and improve your AI's responses
                with domain-specific information.
              </p>
              <Button className="mt-4 w-full">Manage Knowledge Base</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  )
}
