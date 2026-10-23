import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { SessionSidebar, type ChatSession } from '../components/session-sidebar'

export const Route = createFileRoute('/')({
  loader: async () => {
    const response = await fetch('/api/chat/sessions')
    if (!response.ok) throw new Error('Could not load chat sessions.')
    return response.json() as Promise<{ sessions: ChatSession[] }>
  },
  component: Home,
})

function Home() {
  const { sessions } = Route.useLoaderData()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  function startChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = text.trim()
    if (!prompt) return

    const id = crypto.randomUUID()
    sessionStorage.setItem(`pending-chat:${id}`, prompt)
    void navigate({ to: '/s/$id', params: { id } })
  }

  return (
    <main className="flex h-dvh bg-white text-slate-900">
      <SessionSidebar sessions={sessions} />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-100 px-4 md:border-0 md:px-6">
          <h1 className="text-sm font-semibold">PT Bisi HR</h1>
          <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">Demo</span>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <div className="w-full max-w-3xl">
            <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">Ada yang bisa saya bantu?</h2>
            <form onSubmit={startChat} className="flex items-end gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-slate-400">
              <textarea
                aria-label="Pesan untuk asisten HR"
                placeholder="Tulis pesan"
                rows={1}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Kirim
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-slate-400">Jawaban AI dapat keliru. Pastikan kebijakan resmi kepada HR.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
