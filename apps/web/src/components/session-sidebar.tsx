import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

export type ChatSession = {
  sessionId: string
  updatedAt: string
  title: string
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  busySessionId,
}: {
  sessions: ChatSession[]
  activeSessionId?: string
  busySessionId?: string
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [editingSessionId, setEditingSessionId] = useState<string>()
  const [editedTitle, setEditedTitle] = useState('')

  async function saveTitle(event: FormEvent<HTMLFormElement>, sessionId: string) {
    event.preventDefault()
    const response = await fetch(`/api/chat/${sessionId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editedTitle }),
    })

    if (!response.ok) {
      window.alert('Judul percakapan gagal disimpan.')
      return
    }

    setEditingSessionId(undefined)
    await router.invalidate()
  }

  async function deleteSession(sessionId: string) {
    if (!window.confirm('Hapus percakapan ini?')) return

    const response = await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' })
    if (!response.ok) {
      window.alert('Percakapan gagal dihapus.')
      return
    }

    if (activeSessionId === sessionId) {
      await navigate({ to: '/' })
      return
    }

    await router.invalidate()
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#123b2a] p-3 text-white md:flex">
      <Link
        to="/"
        className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-white/10"
      >
        <span className="flex size-7 items-center justify-center rounded-full border border-white/40 text-lg leading-none">+</span>
        Chat baru
      </Link>

      <p className="mb-2 mt-8 px-3 text-xs font-semibold text-white/60">Percakapan</p>
      <nav aria-label="Percakapan sebelumnya" className="space-y-1">
        {sessions.map((session) => {
          const sessionBusy = busySessionId === session.sessionId

          return (
            <div key={session.sessionId} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-white/10">
              {editingSessionId === session.sessionId ? (
                <form onSubmit={(event) => void saveTitle(event, session.sessionId)} className="flex min-w-0 flex-1 items-center gap-1">
                  <input
                    aria-label="Judul percakapan"
                    autoFocus
                    disabled={sessionBusy}
                    maxLength={80}
                    value={editedTitle}
                    onChange={(event) => setEditedTitle(event.target.value)}
                    className="min-w-0 flex-1 rounded bg-white px-2 py-1 text-slate-900 outline-none disabled:opacity-50"
                  />
                  <button type="submit" disabled={sessionBusy || !editedTitle.trim()} className="text-xs text-white hover:underline disabled:opacity-40">
                    Simpan
                  </button>
                  <button type="button" onClick={() => setEditingSessionId(undefined)} className="text-xs text-white/70 hover:underline">
                    Batal
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    to="/s/$id"
                    params={{ id: session.sessionId }}
                    className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-white/85"
                    title={session.title}
                  >
                    {session.title}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Edit judul ${session.title}`}
                    disabled={sessionBusy}
                    onClick={() => {
                      setEditingSessionId(session.sessionId)
                      setEditedTitle(session.title)
                    }}
                    className="rounded p-1.5 text-white/70 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                      <path d="m15 5 4 4M4 20l4.3-.9L19 8.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus percakapan ${session.title}`}
                    disabled={sessionBusy}
                    onClick={() => void deleteSession(session.sessionId)}
                    className="rounded p-1.5 text-white/70 hover:bg-red-900/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-white/15 px-3 pt-3 text-xs text-white/60">
        PT Bisi HR · Demo
      </div>
    </aside>
  )
}
