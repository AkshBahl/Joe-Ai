import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import { getPineconeClient } from "@/lib/pinecone-client"

export async function GET(req: NextRequest) {
  try {
    const testType = req.nextUrl.searchParams.get("type") || "all"
    const results: any = {}

    // Test OpenAI connection
    if (testType === "openai" || testType === "all") {
      try {
        // Check if OpenAI API key is set
        const openaiApiKey = process.env.OPENAI_API_KEY
        if (!openaiApiKey) {
          results.openai = {
            success: false,
            error: "OpenAI API key is not configured",
          }
        } else {
          // Initialize OpenAI client (server-side only)
          const openai = new OpenAI({
            apiKey: openaiApiKey,
          })

          // Make a simple API call to verify the key works
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hello, are you working?" }],
            max_tokens: 10,
          })

          results.openai = {
            success: true,
            message: "OpenAI API key is working",
            response: completion.choices[0].message.content,
          }
        }
      } catch (error: any) {
        results.openai = {
          success: false,
          error: `Failed to test OpenAI API: ${error.message}`,
        }
      }
    }

    // Test Pinecone connection
    if (testType === "pinecone" || testType === "all") {
      try {
        // Check if Pinecone API key is set
        if (!process.env.PINECONE_API_KEY) {
          results.pinecone = {
            success: false,
            error: "Pinecone API key is not configured",
          }
        } else {
          // Get Pinecone client
          const pinecone = await getPineconeClient()

          // List indexes to verify connection
          const indexes = await pinecone.listIndexes()

          results.pinecone = {
            success: true,
            message: "Pinecone API key is working",
            indexes: indexes.indexes,
          }
        }
      } catch (error: any) {
        results.pinecone = {
          success: false,
          error: `Failed to test Pinecone API: ${error.message}`,
        }
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Error testing connections:", error)
    return NextResponse.json(
      {
        error: "Failed to test connections",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
