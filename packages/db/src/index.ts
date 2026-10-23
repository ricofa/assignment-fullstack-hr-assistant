import { DrizzleMemoryStore } from '@anvia/memory-drizzle'
import { and, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { schema } from './schema.js'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/harness',
})

const db = drizzle(pool, { schema })
export const memoryStore: DrizzleMemoryStore = new DrizzleMemoryStore({ db })

export async function getMemorySessionTitle(sessionId: string, userId: string): Promise<string | undefined> {
  const sessions = schema.agentMemorySessions
  const [session] = await db
    .select({ metadata: sessions.metadata })
    .from(sessions)
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)))
    .limit(1)

  const title = session?.metadata.title
  return typeof title === 'string' && title.trim() ? title : undefined
}

export async function setMemorySessionTitle(
  sessionId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const sessions = schema.agentMemorySessions
  const updated = await db
    .update(sessions)
    .set({ metadata: sql`${sessions.metadata} || jsonb_build_object('title', ${title})` })
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id })

  return updated.length > 0
}
