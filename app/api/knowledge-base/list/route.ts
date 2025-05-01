import { NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"

export async function GET(req: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    if (!openaiApiKey || !assistantId) {
      return NextResponse.json({ success: false, files: [], error: "Missing OpenAI API key or Assistant ID" }, { status: 400 })
    }
    const openai = new OpenAI({ apiKey: openaiApiKey })
    // Get the assistant
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    // Get the vector store IDs
    const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids || []
    let attachedFiles: any[] = []
    for (const vectorStoreId of vectorStoreIds) {
      let after: string | undefined = undefined
      let keepGoing = true
      while (keepGoing) {
        const url = new URL(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`)
        url.searchParams.set("limit", "100")
        if (after) url.searchParams.set("after", after)
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { "Authorization": `Bearer ${openaiApiKey}` }
        })
        if (!res.ok) break
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
          attachedFiles.push(...data.data)
        }
        if (data.has_more && data.data.length > 0) {
          after = data.data[data.data.length - 1].id
        } else {
          keepGoing = false
        }
      }
    }
    // Get metadata for each file
    const allFiles = await openai.files.list()
    const filesWithMeta = attachedFiles.map((file) => {
      const meta = allFiles.data.find((f) => f.id === file.id)
      return {
        id: file.id,
        filename: meta?.filename || file.id,
        size: meta ? `${(meta.bytes / 1024).toFixed(2)} KB` : "-",
        created_at: meta ? new Date(meta.created_at * 1000).toLocaleDateString() : "-",
      }
    })
    return NextResponse.json({ success: true, files: filesWithMeta, error: null })
  } catch (error: any) {
    return NextResponse.json({ success: false, files: [], error: error.message }, { status: 500 })
  }
} 