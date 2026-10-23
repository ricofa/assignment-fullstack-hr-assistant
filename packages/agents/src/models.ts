import { OpenAIClient } from '@anvia/openai'

let client: OpenAIClient | undefined

export const defaultModelId = 'deepseek-v4.1-flash'

export function getModel(modelId: string = defaultModelId) {
  if (!modelId.trim()) {
    throw new Error('modelId is required')
  }

  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY!
    const baseUrl = process.env.OPENAI_BASE_URL
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
    if (!baseUrl) {
      throw new Error('OPENAI_BASE_URL is required')
    }
    client = new OpenAIClient({ apiKey, baseUrl })
  }

  return client.completionModel({ modelId, api: 'chat' })
}
