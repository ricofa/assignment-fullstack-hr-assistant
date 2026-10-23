import { tavily } from '@tavily/core'

export function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is required for web tools')
  }

  return tavily({ apiKey })
}
