import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    if (!openaiApiKey || !assistantId) {
      return NextResponse.json({ success: false, file: null, attached: null, error: "Missing OpenAI API key or Assistant ID" }, { status: 400 })
    }
    const openai = new OpenAI({ apiKey: openaiApiKey })
    // Get file from form data
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ success: false, file: null, attached: null, error: "No file uploaded" }, { status: 400 })
    }
    // Upload file to OpenAI
    const uploaded = await openai.files.create({
      file,
      purpose: "assistants"
    })
    // Get the assistant to find the vector store ID
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids
    if (!vectorStoreIds || !vectorStoreIds.length) {
      return NextResponse.json({ success: false, file: uploaded, attached: null, error: "No vector store attached to assistant" }, { status: 400 })
    }
    const vectorStoreId = vectorStoreIds[0]
    // Attach file to assistant's vector store using fetch
    const attachRes = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ file_id: uploaded.id })
    })
    if (!attachRes.ok) {
      const errorText = await attachRes.text()
      return NextResponse.json({ success: false, file: uploaded, attached: null, error: `Failed to attach file: ${errorText}` }, { status: 500 })
    }
    const attachData = await attachRes.json()
    return NextResponse.json({ success: true, file: uploaded, attached: attachData, error: null })
  } catch (error: any) {
    return NextResponse.json({ success: false, file: null, attached: null, error: error.message }, { status: 500 })
  }
} 