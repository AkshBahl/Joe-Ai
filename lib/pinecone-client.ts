import { Pinecone } from "@pinecone-database/pinecone"

let pineconeInstance: Pinecone | null = null

export async function getPineconeClient() {
  if (!pineconeInstance) {
    // Check for environment variables
    const apiKey = process.env.PINECONE_API_KEY

    if (!apiKey) {
      throw new Error("Pinecone API key not found")
    }

    // Initialize Pinecone client with the correct parameters
    pineconeInstance = new Pinecone({
      apiKey
    })
  }

  return pineconeInstance
}

// Helper function to get an index
export async function getPineconeIndex(indexName = process.env.PINECONE_INDEX_NAME || "custom-gpt-knowledge") {
  const pinecone = await getPineconeClient()
  return pinecone.Index(indexName)
}

// Helper function to check if index exists and create it if it doesn't
export async function ensurePineconeIndex(
  indexName = process.env.PINECONE_INDEX_NAME || "custom-gpt-knowledge",
  dimension = 1024,
) {
  const pinecone = await getPineconeClient()

  try {
    // List all indexes
    const indexes = await pinecone.listIndexes()

    // Check if our index exists
    const indexExists = indexes.indexes?.some((index) => index.name === indexName) ?? false

    if (!indexExists) {
      console.log(`Creating new Pinecone index: ${indexName}`)

      // Get the environment/region from the PINECONE_ENVIRONMENT variable
      const environment = process.env.PINECONE_ENVIRONMENT || "us-east1-gcp"

      await pinecone.createIndex({
        name: indexName,
        dimension: 1024,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: environment,
          },
        },
      })

      // Wait for index to be initialized
      await new Promise((resolve) => setTimeout(resolve, 60000))
    }

    return pinecone.Index(indexName)
  } catch (error) {
    console.error("Error ensuring Pinecone index:", error)
    throw error
  }
}
