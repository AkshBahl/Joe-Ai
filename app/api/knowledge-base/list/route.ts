import { type NextRequest, NextResponse } from "next/server"
import { getPineconeIndex } from "@/lib/pinecone-client"

export async function GET(req: NextRequest) {
  try {
    // Check if Pinecone API key is set
    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Pinecone API key is not configured",
        },
        { status: 500 },
      )
    }

    // Try to get the Pinecone index
    let index
    try {
      index = await getPineconeIndex()
    } catch (error: any) {
      console.error("Error connecting to Pinecone:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to Pinecone",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Fetch stats to get a count of vectors
    let stats
    try {
      stats = await index.describeIndexStats()
    } catch (error: any) {
      console.error("Error fetching Pinecone stats:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch Pinecone stats",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Get the dimension of the index
    const indexDimension = stats.dimension || 1024

    // In a real implementation, we would store metadata about uploaded files
    // in a database. For this example, we'll try to extract unique sources from metadata
    const namespaces = stats.namespaces || {}
    const defaultNamespace = namespaces[""] || { vectorCount: 0 }

    // If there are no vectors, return empty array
    if (defaultNamespace.vectorCount === 0) {
      return NextResponse.json({
        success: true,
        files: [],
        stats: {
          totalVectors: 0,
          dimensions: indexDimension,
        },
      })
    }

    // Create a zero vector with the correct dimension
    const zeroVector = new Array(indexDimension).fill(0)

    // Query for some vectors to extract metadata
    let queryResponse
    try {
      queryResponse = await index.query({
        topK: 100,
        includeMetadata: true,
        vector: zeroVector,
      })
    } catch (error: any) {
      console.error("Error querying Pinecone:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to query Pinecone",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Extract unique file sources from metadata
    const uniqueFiles = new Map()

    if (queryResponse.matches) {
      queryResponse.matches.forEach((match) => {
        if (match.metadata && match.metadata.source && match.metadata.id) {
          const fileId = match.metadata.id.split("-chunk-")[0]

          if (!uniqueFiles.has(fileId)) {
            uniqueFiles.set(fileId, {
              id: fileId,
              name: match.metadata.source,
              date: match.metadata.uploadDate || new Date().toISOString(),
              size: match.metadata.size ? `${Math.round(match.metadata.size / 1024)} KB` : "Unknown",
              vectors: 1,
            })
          } else {
            const file = uniqueFiles.get(fileId)
            file.vectors += 1
          }
        }
      })
    }

    const files = Array.from(uniqueFiles.values())

    return NextResponse.json({
      success: true,
      files,
      stats: {
        totalVectors: stats.totalVectorCount,
        dimensions: indexDimension,
      },
    })
  } catch (error: any) {
    console.error("Error listing knowledge base:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list knowledge base",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
