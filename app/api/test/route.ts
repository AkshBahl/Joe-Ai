import type { NextRequest } from "next/server"
import { OpenAI } from "openai"

export async function GET(req: NextRequest) {
  try {
    // Check if OpenAI API key is set
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

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

    return new Response(
      JSON.stringify({
        success: true,
        message: "OpenAI API key is working",
        response: completion.choices[0].message.content,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error: any) {
    console.error("Error testing OpenAI API:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to test OpenAI API",
        details: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
