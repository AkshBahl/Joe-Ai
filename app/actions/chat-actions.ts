// chat-actions.ts (updated implementation)
"use server"

import { OpenAI } from "openai"

async function getAssistantResponse(messages: any[], threadId?: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const assistantId = process.env.OPENAI_ASSISTANT_ID
  
  if (!assistantId) {
    throw new Error("OpenAI Assistant ID is not configured")
  }
  
  try {
    // Create a new thread if none exists
    const thread = threadId 
      ? await openai.beta.threads.retrieve(threadId)
      : await openai.beta.threads.create()

    // Add the user's message to the thread
    const lastUserMessage = messages.filter(m => m.role === "user").pop()
    if (!lastUserMessage) throw new Error("No user message found")

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: lastUserMessage.content
    })

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    })

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    }

    if (runStatus.status === "completed") {
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id)
      const lastMessage = messages.data[0]
      const textContent = lastMessage.content.find(c => c.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content found in response')
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

// Updated generateChatResponse to use Assistant API
export async function generateChatResponse(messages: any[], vectorRatio = 75, summaryLength = "none") {
  try {
    // Detect if the last user message is a greeting
    const greetings = ["hi", "hello", "hey"]; // Add more greetings if needed
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content?.toLowerCase() || "";
    const shouldIntroduce = greetings.some(greet => lastUserMessage.startsWith(greet));

    let systemPrompt = shouldIntroduce
      ? "You are Joseph Malchar, a steel expert. Introduce yourself and greet the user."
      : "You are Joseph Malchar, a steel expert. Do NOT introduce yourself unless the user greets you. Answer directly and concisely.";

    // Add summary length instruction if set
    if (summaryLength !== "none") {
      systemPrompt += ` Please answer in no more than ${summaryLength} words.`;
    }

    // Pass the systemPrompt as the first message
    const assistantMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    return await getAssistantResponse(assistantMessages)
  } catch (error) {
    console.error("Chat error:", error)
    return "An error occurred while generating the response"
  }
}
