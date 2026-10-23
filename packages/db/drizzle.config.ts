import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'drizzle-kit'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/harness',
  },
})
