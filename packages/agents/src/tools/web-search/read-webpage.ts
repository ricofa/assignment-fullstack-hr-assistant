import { createTool } from '@anvia/core'
import { z } from 'zod'
import { getTavilyClient } from './client.js'

export const readWebpageTool = createTool({
  name: 'read-webpage',
  description: 'Read a specific webpage by URL. Returns the source URL and extracted page content.',
  inputSchema: z.object({
    url: z.string().url().refine(
      (value) => ['http:', 'https:'].includes(new URL(value).protocol),
      'Only HTTP and HTTPS URLs are supported',
    ).describe('The webpage URL to read.'),
  }),
  async execute({ url }) {
    const client = getTavilyClient()
    const response = await client.extract([url])
    const page = response.results[0]

    if (!page?.rawContent) {
      throw new Error(`Could not read webpage: ${url}`)
    }

    return { url: page.url, content: page.rawContent }
  },
})
