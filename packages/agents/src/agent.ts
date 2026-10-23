import { Agent, type Message } from '@anvia/core'
import { memoryStore } from '@harness/db'
import { document } from './context/document.js'
import { indonesiaRules } from './context/indonesia-rules.js'
import { instructions } from './instruction.js'
import { lensObserver } from './lens.js'
import { defaultModelId, getModel } from './models.js'
import { searchWebTool } from './tools/web-search/search-web.js'
import { readWebpageTool } from './tools/web-search/read-webpage.js'

export type RunAgentOptions = {
  messages: readonly Message[]
  modelId?: string
  maxTurns?: number
  memory?: {
    sessionId: string
    userId: string
    metadata?: { title?: string }
  }
}

export function runAgent(options: RunAgentOptions) {
  const { messages, modelId = defaultModelId, maxTurns = 25, memory } = options

  const agent = new Agent({
    id: 'pt-bisi-hr',
    name: 'PT Bisi HR Agent',
    model: getModel(modelId),
    instructions,
    context: [document, indonesiaRules],
    tools: [searchWebTool, readWebpageTool],
    maxTurns,
    memory: { store: memoryStore, savePolicy: 'turn' },
    observability: {
      observers: { lens: lensObserver },
      primaryTrace: 'lens',
    },
  })

  if (memory) {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')

    if (!latestUserMessage) {
      throw new Error('A user message is required to use memory.')
    }

    const prompt = typeof latestUserMessage.content === 'string'
      ? latestUserMessage.content
      : latestUserMessage.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n')

    return agent.stream({ prompt, session: memory })
  }

  return agent.stream({ messages })
}
