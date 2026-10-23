import { createTool } from '@anvia/core'
import { z } from 'zod'
import { getTavilyClient } from './client.js'

export const searchWebTool = createTool({
  name: 'search-web',
  description: 'Search the web for current information. Returns source titles, URLs, and excerpts.',
  inputSchema: z.object({
    query: z.string().trim().min(1).describe('The search query.'),
    maxResults: z.number().int().min(1).max(10).default(5),
  }),
  async execute({ query, maxResults }) {
    const client = getTavilyClient()
    const response = await client.search(query, { maxResults })

    return response.results.map(({ title, url, content }) => ({
      title,
      url,
      content,
    }))
  },
})
