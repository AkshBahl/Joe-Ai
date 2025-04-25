import { type NextRequest, NextResponse } from "next/server"
import { splitTextIntoChunks, cleanText } from "@/lib/text-processing"
import { getPineconeIndex } from "@/lib/pinecone-client"
import { v4 as uuidv4 } from "uuid"
import { OpenAI } from "openai"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
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
      model: "text-embedding-ada-002",
      input: text,
    })

    return response.data[0].embedding
  } catch (error: any) {
    console.error("Error generating embedding:", error)
    throw new Error(`Failed to generate embedding: ${error.message}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Starting file upload process...")

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
    }

    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json({ error: "Pinecone API key is not configured" }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)

    // Read file content as text
    const fileContent = await file.text()
    console.log(`File content length: ${fileContent.length} characters`)

    const cleanedContent = cleanText(fileContent)
    console.log(`Cleaned content length: ${cleanedContent.length} characters`)

    // Split content into chunks
    const chunks = splitTextIntoChunks(cleanedContent)
    console.log(`Split into ${chunks.length} chunks`)

    // Create metadata for the file
    const fileId = `${file.name.replace(/\s+/g, "-")}-${uuidv4()}`

    // Get Pinecone index
    console.log("Connecting to Pinecone...")
    const index = await getPineconeIndex()
    console.log("Connected to Pinecone successfully")

    // Get index stats to determine the dimension
    const indexStats = await index.describeIndexStats()
    const indexDimension = indexStats.dimension || 1024 // Default to 1024 if not specified
    console.log(`Pinecone index dimension: ${indexDimension}`)

    // Process chunks and upload to Pinecone
    console.log("Starting to process chunks and upload to Pinecone...")
    const batchSize = 5 // Process in smaller batches to avoid timeouts

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)

      // Generate embeddings for each chunk
      const embeddings = await Promise.all(
        batch.map(async (chunk, idx) => {
          console.log(`Generating embedding for chunk ${i + idx + 1}/${chunks.length}`)
          const embedding = await generateEmbedding(chunk)

          // If the embedding dimension doesn't match the index dimension, resize it
          let resizedEmbedding = embedding
          if (embedding.length !== indexDimension) {
            console.log(`Resizing embedding from ${embedding.length} to ${indexDimension}`)
            if (embedding.length > indexDimension) {
              // Truncate if larger
              resizedEmbedding = embedding.slice(0, indexDimension)
            } else {
              // Pad with zeros if smaller
              resizedEmbedding = [...embedding, ...new Array(indexDimension - embedding.length).fill(0)]
            }
          }

          return {
            id: `${fileId}-chunk-${i + idx}`,
            values: resizedEmbedding,
            metadata: {
              pageContent: chunk,
              source: file.name,
              type: file.type,
              size: file.size,
              uploadDate: new Date().toISOString(),
              id: fileId,
              chunkIndex: i + idx,
              totalChunks: chunks.length,
            },
          }
        }),
      )

      // Upsert embeddings to Pinecone
      console.log(`Upserting ${embeddings.length} vectors to Pinecone`)
      await index.upsert(embeddings)
      console.log(`Batch ${Math.floor(i / batchSize) + 1} completed`)
    }

    console.log("File processing completed successfully")
    return NextResponse.json({
      success: true,
      message: `File ${file.name} processed successfully`,
      chunks: chunks.length,
      fileId: fileId,
    })
  } catch (error: any) {
    console.error("Error processing file:", error)
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
