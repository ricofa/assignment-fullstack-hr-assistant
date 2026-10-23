import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { agentToClientStream, parseClientStreamRequest } from '@anvia/client'
import { createClientStreamResponse } from '@anvia/server'
import { runAgent } from '@harness/agents'
import { getMemorySessionTitle, memoryStore, setMemorySessionTitle } from '@harness/db'
import { createChatTitle } from './chat-title.js'

const app = new Hono()
const userId = 'default-user'
const activeSessions = new Set<string>()

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/api/chat/sessions', async (c) => {
  const conversations = await memoryStore.inspector?.listConversations({ limit: 50, userId }) ?? []
  const sessions = conversations.map((session) => ({
    sessionId: session.sessionId,
    updatedAt: session.updatedAt,
    title: typeof session.metadata?.title === 'string' && session.metadata.title.trim()
      ? session.metadata.title
      : `Sesi ${session.sessionId.slice(0, 8)}`,
  }))

  return c.json({ sessions })
})

app.get('/api/chat/:sessionId', async (c) => {
  const parsedSessionId = z.string().uuid().safeParse(c.req.param('sessionId'))
  if (!parsedSessionId.success) return c.json({ error: 'Invalid session id.' }, 400)

  const messages = await memoryStore.load({
    scope: { sessionId: parsedSessionId.data, userId },
  })

  return c.json({ messages })
})

app.patch('/api/chat/:sessionId/title', async (c) => {
  const parsedSessionId = z.string().uuid().safeParse(c.req.param('sessionId'))
  if (!parsedSessionId.success) return c.json({ error: 'Invalid session id.' }, 400)
  if (activeSessions.has(parsedSessionId.data)) {
    return c.json({ error: 'Wait for the current reply before editing this session.' }, 409)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid title.' }, 400)
  }

  const parsedBody = z.object({ title: z.string().trim().min(1).max(80) }).safeParse(body)
  if (!parsedBody.success) return c.json({ error: 'Title must be between 1 and 80 characters.' }, 400)
  if (activeSessions.has(parsedSessionId.data)) {
    return c.json({ error: 'Wait for the current reply before editing this session.' }, 409)
  }

  activeSessions.add(parsedSessionId.data)
  try {
    const updated = await setMemorySessionTitle(parsedSessionId.data, userId, parsedBody.data.title)
    if (!updated) return c.json({ error: 'Chat session not found.' }, 404)

    return c.json({ title: parsedBody.data.title })
  } finally {
    activeSessions.delete(parsedSessionId.data)
  }
})

app.delete('/api/chat/:sessionId', async (c) => {
  const parsedSessionId = z.string().uuid().safeParse(c.req.param('sessionId'))
  if (!parsedSessionId.success) return c.json({ error: 'Invalid session id.' }, 400)
  if (activeSessions.has(parsedSessionId.data)) {
    return c.json({ error: 'Wait for the current reply before deleting this session.' }, 409)
  }

  activeSessions.add(parsedSessionId.data)
  try {
    await memoryStore.clear({ scope: { sessionId: parsedSessionId.data, userId } })
    return c.body(null, 204)
  } finally {
    activeSessions.delete(parsedSessionId.data)
  }
})

app.post('/api/chat/:sessionId', async (c) => {
  const parsedSessionId = z.string().uuid().safeParse(c.req.param('sessionId'))
  if (!parsedSessionId.success) return c.json({ error: 'Invalid session id.' }, 400)
  if (activeSessions.has(parsedSessionId.data)) {
    return c.json({ error: 'A reply is already running for this session.' }, 409)
  }

  let body
  try {
    body = parseClientStreamRequest(await c.req.json())
  } catch {
    return c.json({ error: 'Invalid chat request.' }, 400)
  }

  if (body.type !== 'messages' || body.messages.length === 0) {
    return c.json({ error: 'Send at least one chat message.' }, 400)
  }
  if (activeSessions.has(parsedSessionId.data)) {
    return c.json({ error: 'A reply is already running for this session.' }, 409)
  }

  activeSessions.add(parsedSessionId.data)
  try {
    const scope = { sessionId: parsedSessionId.data, userId }
    const [currentTitle, savedMessages] = await Promise.all([
      getMemorySessionTitle(scope.sessionId, userId),
      memoryStore.load({ scope }),
    ])
    const firstUserMessage = [...savedMessages, ...body.messages].find((message) => message.role === 'user')
    const firstMessageText = typeof firstUserMessage?.content === 'string'
      ? firstUserMessage.content
      : firstUserMessage?.content.filter((part) => part.type === 'text').map((part) => part.text).join(' ') ?? ''
    const title = currentTitle ?? createChatTitle(firstMessageText)

    const stream = runAgent({
      messages: body.messages,
      memory: { ...scope, metadata: title ? { title } : undefined },
    })
    const events = (async function* () {
      try {
        yield* agentToClientStream({ events: stream })
      } finally {
        activeSessions.delete(parsedSessionId.data)
      }
    })()

    return createClientStreamResponse({ events })
  } catch (error) {
    activeSessions.delete(parsedSessionId.data)
    throw error
  }
})

app.get(
  '/api/hello',
  zValidator('query', z.object({ name: z.string().trim().min(1).default('world') })),
  (c) => {
    const { name } = c.req.valid('query')
    return c.json({ message: `Hello, ${name}!` })
  },
)

export default app
