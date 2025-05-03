"use server"

import { OpenAI } from "openai"

async function getAssistantResponse(messages: any[], threadId?: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const assistantId = process.env.OPENAI_ASSISTANT_ID

  if (!assistantId) {
    throw new Error("OpenAI Assistant ID is not configured")
  }

  try {
    const thread = threadId
      ? await openai.beta.threads.retrieve(threadId)
      : await openai.beta.threads.create()

    const lastUserMessage = messages.filter(m => m.role === "user").pop()
    if (!lastUserMessage) throw new Error("No user message found")

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: lastUserMessage.content
    })

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    })

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    }

    if (runStatus.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id)
      const lastMessage = messages.data[0]
      const textContent = lastMessage.content.find(c => c.type === "text")
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content found in response")
      }
      return textContent.text.value
    } else {
      throw new Error(`Run ended with status: ${runStatus.status}`)
    }
  } catch (error) {
    console.error("Assistant API error:", error)
    throw error
  }
}

export async function generateChatResponse(messages: any[]) {
  try {
    return await getAssistantResponse(messages)
  } catch (error) {
    console.error("Chat error:", error)
    return "An error occurred while generating the response"
  }
}
