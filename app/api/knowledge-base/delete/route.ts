import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    if (!openaiApiKey || !assistantId) {
      return NextResponse.json({ success: false, error: "Missing OpenAI API key or Assistant ID" }, { status: 400 })
    }
    const openai = new OpenAI({ apiKey: openaiApiKey })
    const { file_id } = await req.json()
    if (!file_id) {
      return NextResponse.json({ success: false, error: "No file_id provided" }, { status: 400 })
    }
    // Get the assistant to find the vector store ID
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids
    if (!vectorStoreIds || !vectorStoreIds.length) {
      return NextResponse.json({ success: false, error: "No vector store attached to assistant" }, { status: 400 })
    }
    const vectorStoreId = vectorStoreIds[0]
    // Remove file from vector store using fetch
    const detachRes = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${file_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`
      }
    })
    if (!detachRes.ok) {
      const errorText = await detachRes.text()
      return NextResponse.json({ success: false, error: `Failed to detach file: ${errorText}` }, { status: 500 })
    }
    // Delete file from OpenAI storage
    await openai.files.del(file_id)
    return NextResponse.json({ success: true, error: null })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
} 