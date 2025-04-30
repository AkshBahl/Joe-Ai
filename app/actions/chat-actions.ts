// chat-actions.ts (updated implementation)
"use server"

import { OpenAI } from "openai"
import { getPineconeClient } from "@/lib/pinecone-client"

// Modified queryPinecone with topK fixed to 3
async function queryPinecone(query: string, vectorRatio = 75) {
  try {
    if (!process.env.PINECONE_API_KEY) return []
    
    const embedding = await generateEmbedding(query)
    const pinecone = await getPineconeClient()
    const indexName = process.env.PINECONE_INDEX_NAME || "custom-gpt-knowledge"
    const index = pinecone.index(indexName)

    // Always use topK = 3 regardless of ratio
    const topK = 10
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    })

    return queryResponse.matches?.map(match => ({
      pageContent: match.metadata?.pageContent || "No content available",
      metadata: match.metadata || {},
      score: match.score || 0,
    })) || []
  } catch (error) {
    console.error("Pinecone query error:", error)
    return []
  }
}

// Function to generate embeddings using OpenAI - SERVER SIDE ONLY
async function generateEmbedding(text: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured")
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  })

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
    input: text,
     dimensions: 1024,
    })

    return response.data[0].embedding
  } catch (error: any) {
    console.error("Error generating embedding:", error)
    throw new Error(`Failed to generate embedding: ${error.message}`)
  }
}

// New chat history summarization function
function summarizeHistory(messages: any[], maxTokens = 500): any[] {
  const summary = messages
    .slice(-3) // Keep last 3 exchanges
    .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
    .join('\n')
  
  return [
    {
      role: "system",
      content: `Chat history summary:\n${summary}`
    },
    ...messages.slice(-1) // Keep last message
  ]
}

// Updated generateChatResponse with exclusive modes
export async function generateChatResponse(messages: any[], vectorRatio = 75, summaryLength = "none") {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const lastUserMessage = messages.filter(m => m.role === "user").pop()
    if (!lastUserMessage) throw new Error("No user message found")

    // Handle 100% Vector Search
    if (vectorRatio === 100) {
      const results = await queryPinecone(lastUserMessage.content)
      if (results.length === 0) return "No relevant information found in knowledge base."
      
      const context = results.map(doc => doc.pageContent).join("\n\n")
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "Answer strictly using the provided context:\n" + context
        }, {
          role: "user",
          content: lastUserMessage.content
        }]
      })
      return completion.choices[0].message.content
    }

    // Handle 0% Vector Search (Pure Web)
    if (vectorRatio === 0) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: summarizeHistory(messages),
        temperature: 0.7
      })
      return completion.choices[0].message.content
    }

    // Hybrid Mode (Original logic with summarization)
    const results = await queryPinecone(lastUserMessage.content)
    const context = results.map(doc => doc.pageContent).join("\n\n")
    
    return await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        ...summarizeHistory(messages),
        {
          role: "system",
          content: context 
            ? `Context from knowledge base:\n${context}`
            : "No relevant context found"
        },
        { role: "user", content: lastUserMessage.content }
      ]
    }).then(res => res.choices[0].message.content)

  } catch (error) {
    console.error("Chat error:", error)
    return "An error occurred while generating the response"
  }
}
