import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"

export async function GET(req: NextRequest) {
  try {
    const testType = req.nextUrl.searchParams.get("type") || "all"
    const results: any = {}

    // Test OpenAI connection
    if (testType === "openai" || testType === "all") {
      try {
        const openaiApiKey = process.env.OPENAI_API_KEY
        const assistantId = process.env.OPENAI_ASSISTANT_ID

        if (!openaiApiKey) {
          results.openai = {
            success: false,
            error: "OpenAI API key is not configured",
          }
        } else if (!assistantId) {
          results.openai = {
            success: false,
            error: "OpenAI Assistant ID is not configured",
          }
        } else {
          const openai = new OpenAI({
            apiKey: openaiApiKey,
          })

          // Test Assistant API
          const assistant = await openai.beta.assistants.retrieve(assistantId)

          results.openai = {
            success: true,
            message: "OpenAI API and Assistant API are working",
            assistant: {
              name: assistant.name,
              model: assistant.model,
            }
          }
        }
      } catch (error: any) {
        results.openai = {
          success: false,
          error: `Failed to test OpenAI API: ${error.message}`,
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
