"use server"

import { OpenAI } from "openai"
import { getPineconeClient } from "@/lib/pinecone-client"

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
      model: "text-embedding-ada-002",
      input: text,
    })

    return response.data[0].embedding
  } catch (error: any) {
    console.error("Error generating embedding:", error)
    throw new Error(`Failed to generate embedding: ${error.message}`)
  }
}

// Function to query Pinecone for vector search
async function queryPinecone(query: string, vectorRatio = 75) {
  try {
    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      console.log("Pinecone API key is not configured, skipping vector search")
      return []
    }

    console.log(`Performing vector search for query: "${query}" with vectorRatio: ${vectorRatio}`)

    // Generate embedding for the query
    console.log("Generating embedding for query...")
    const embedding = await generateEmbedding(query)
    console.log("Embedding generated successfully, length:", embedding.length)

    // Get Pinecone client
    console.log("Connecting to Pinecone...")
    const pinecone = await getPineconeClient()
    const indexName = process.env.PINECONE_INDEX_NAME || "custom-gpt-knowledge"
    console.log(`Using Pinecone index: ${indexName}`)
    const index = pinecone.index(indexName)

    // Get index stats to determine the dimension
    const indexStats = await index.describeIndexStats()
    const indexDimension = indexStats.dimension || 1024 // Default to 1024 if not specified
    console.log(`Pinecone index dimension: ${indexDimension}, total vectors: ${indexStats.totalRecordCount || 0}`)

    // Resize embedding if needed
    let queryEmbedding = embedding
    if (embedding.length !== indexDimension) {
      console.log(`Resizing query embedding from ${embedding.length} to ${indexDimension}`)
      if (embedding.length > indexDimension) {
        // Truncate if larger
        queryEmbedding = embedding.slice(0, indexDimension)
      } else {
        // Pad with zeros if smaller
        queryEmbedding = [...embedding, ...new Array(indexDimension - embedding.length).fill(0)]
      }
    }

    // Adjust the topK value based on vectorRatio
    const topK = Math.max(1, Math.floor(5 * (vectorRatio / 100)))
    console.log(`Using topK: ${topK} for vector search`)

    // Query Pinecone
    console.log("Querying Pinecone...")
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    })
    console.log(`Received ${queryResponse.matches?.length || 0} matches from Pinecone`)

    // Extract and return the results
    const results: Array<{
      pageContent: string;
      metadata: Record<string, any>;
      score: number;
    }> = []
    
    queryResponse.matches?.forEach((match) => {
      const result = {
        pageContent: typeof match.metadata?.pageContent === "string" 
          ? match.metadata.pageContent 
          : Array.isArray(match.metadata?.pageContent)
            ? match.metadata.pageContent.join(", ") 
            : String(match.metadata?.pageContent || "No content available"),
        metadata: match.metadata || {},
        score: match.score || 0, // Ensure score is always a number
      }
      console.log(`Match found with score ${result.score}:`, result.pageContent.substring(0, 100) + "...")
      results.push(result)
    })

    console.log(`Processed ${results.length} results from vector search`)
    return results
  } catch (error: any) {
    console.error("Error querying Pinecone:", error)
    console.error("Error details:", error.message)
    return [] // Return empty array on error
  }
}

export async function generateChatResponse(messages: any[], vectorRatio = 75, summaryLength = "none") {
  try {
    console.log("Starting chat response generation...")

    // Check if OpenAI API key is set
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    // Initialize OpenAI client (server-side only)
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Get the last user message
    const lastUserMessage = messages.filter((m) => m.role === "user").pop()

    if (!lastUserMessage) {
      throw new Error("No user message found")
    }

    console.log(`Processing user query: "${lastUserMessage.content}"`)

    // First, try to get relevant information from vector search
    let vectorResponse = null
    try {
      console.log("Starting vector search...")
      const results = await queryPinecone(lastUserMessage.content, vectorRatio)

      if (results && results.length > 0) {
        console.log(`Found ${results.length} relevant documents from knowledge base`)
        
        // Check if we have high confidence results (score > 0.3)
        const highConfidenceResults = results.filter(result => result.score && result.score > 0.3)
        console.log(`Found ${highConfidenceResults.length} results with score > 0.3`)
        
        if (highConfidenceResults.length > 0) {
          console.log(`Using ${highConfidenceResults.length} results for context`)
          const context = highConfidenceResults.map((doc) => doc.pageContent).join("\n\n")
          
          // Create a prompt that uses the vector search results
          const vectorPrompt = `Based on the following information from our knowledge base, please answer the question. If the information doesn't fully answer the question, say so.

Context from knowledge base:
${context}

Question: ${lastUserMessage.content}

Please provide a clear and concise answer based on the information above. If the information doesn't fully answer the question, acknowledge that and provide what you can from the available information.`

          console.log("Vector prompt:", vectorPrompt)

          // Get response from OpenAI using the vector search results
          const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: "You are a helpful AI assistant that answers questions based on the provided context." },
              { role: "user", content: vectorPrompt }
            ] as OpenAI.Chat.ChatCompletionMessageParam[],
          })

          vectorResponse = completion.choices[0].message.content
          console.log("Generated response from vector search results:", vectorResponse)
          
          // Only consider it a valid vector response if it doesn't indicate missing information
          if (vectorResponse && (
              vectorResponse.toLowerCase().includes("does not contain") || 
              vectorResponse.toLowerCase().includes("doesn't contain") ||
              vectorResponse.toLowerCase().includes("no information") ||
              vectorResponse.toLowerCase().includes("not mention"))) {
            console.log("Vector response indicates no information, falling back to general knowledge")
            vectorResponse = null
          }
        }
      }
    } catch (error: any) {
      console.error("Error during vector search:", error)
    }

    // If we have a good vector response, return it
    if (vectorResponse) {
      return vectorResponse
    }

    // If no good vector response, fall back to general OpenAI response
    console.log("No good vector search results found, falling back to general OpenAI response")

    try {
      // Create a direct request without any context about vector search
      const directCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: "You are ChatGPT, a large language model trained by OpenAI. Answer questions directly using your general knowledge. Never say 'the information provided' or similar phrases - just provide the information you know."
          },
          {
            role: "user",
            content: `Tell me about ${lastUserMessage.content}. Who are they and what are they known for?`
          }
        ],
      })
      
      const directResponse = directCompletion.choices[0].message.content
      console.log("Generated direct response:", directResponse)
      return directResponse
    } catch (error: any) {
      console.error("Error generating direct OpenAI response:", error)
      throw new Error(`Failed to generate response: ${error.message}`)
    }
  } catch (error: any) {
    console.error("Error generating chat response:", error)
    throw new Error(`Failed to generate response: ${error.message}`)
  }
}

export async function testOpenAIConnection() {
  try {
    console.log("Testing OpenAI connection...")

    // Check if OpenAI API key is set
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error("OpenAI API key is not configured")
    }

    // Initialize OpenAI client (server-side only)
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Make a simple API call to verify the key works
    console.log("Making test API call to OpenAI...")
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, are you working?" }],
      max_tokens: 10,
    })

    console.log("OpenAI test successful:", completion.choices[0].message.content)

    return {
      success: true,
      message: "OpenAI API key is working",
      response: completion.choices[0].message.content,
    }
  } catch (error: any) {
    console.error("Error testing OpenAI API:", error)
    throw new Error(`Failed to test OpenAI API: ${error.message}`)
  }
}

export async function testPineconeConnection() {
  try {
    console.log("Testing Pinecone connection...")

    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("Pinecone API key is not configured")
    }

    // Get Pinecone client
    const pinecone = await getPineconeClient()

    // List indexes to verify connection
    console.log("Listing Pinecone indexes...")
    const indexes = await pinecone.listIndexes()

    console.log("Pinecone test successful:", indexes)

    return {
      success: true,
      message: "Pinecone API key is working",
      indexes: indexes.indexes?.map((index: { name: string }) => index.name) || [],
    }
  } catch (error: any) {
    console.error("Error testing Pinecone API:", error)
    throw new Error(`Failed to test Pinecone API: ${error.message}`)
  }
}
