import { type NextRequest, NextResponse } from "next/server"
import { getPineconeIndex } from "@/lib/pinecone-client"

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "No file ID provided" }, { status: 400 })
    }

    const index = await getPineconeIndex()

    // Get the dimension of the index
    const indexStats = await index.describeIndexStats()
    const indexDimension = indexStats.dimension || 1024

    // Create a zero vector with the correct dimension
    const zeroVector = new Array(indexDimension).fill(0)

    // Query for vectors with matching ID prefix
    const queryResponse = await index.query({
      topK: 1000,
      includeMetadata: true,
      filter: {
        id: { $startsWith: id },
      },
      vector: zeroVector,
    })

    // Extract vector IDs to delete
    const vectorIds = queryResponse.matches?.map((match) => match.id) || []

    if (vectorIds.length === 0) {
      return NextResponse.json({ error: "No vectors found for this file ID" }, { status: 404 })
    }

    // Delete vectors in batches
    const batchSize = 100
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize)
      await index.deleteMany(batch)
    }

    return NextResponse.json({
      success: true,
      message: `File with ID ${id} removed from knowledge base`,
      deletedVectors: vectorIds.length,
    })
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
