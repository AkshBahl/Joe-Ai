import OpenAI from "openai"

// This function should only be called from server components or API routes
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI API key not found")
  }

  return new OpenAI({
    apiKey,
  })
}

// This function should only be called from server components or API routes
export async function createEmbedding(text: string) {
  const openai = getOpenAIClient()

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  })

  return response.data[0].embedding
}
