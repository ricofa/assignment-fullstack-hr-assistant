import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { UIMessage } from '@anvia/client'
import { createHttpClientTransport } from '@anvia/client'
import { initialMessagesFromMemory, useChat } from '@anvia/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatProvider, ComposerPrimitive, ThreadPrimitive } from '@anvia/react-ui/chat'
import { MessagePrimitive } from '@anvia/react-ui/message'
import { SessionSidebar, type ChatSession } from '../components/session-sidebar'

export const Route = createFileRoute('/s/$id')({
  loader: async ({ params }) => {
    const [historyResponse, sessionsResponse] = await Promise.all([
      fetch(`/api/chat/${params.id}`),
      fetch('/api/chat/sessions'),
    ])

    if (!historyResponse.ok || !sessionsResponse.ok) {
      throw new Error('Could not load chat session.')
    }

    return Promise.all([
      historyResponse.json() as Promise<{
        messages: Parameters<typeof initialMessagesFromMemory>[0]
      }>,
      sessionsResponse.json() as Promise<{ sessions: ChatSession[] }>,
    ]).then(([history, sessions]) => ({ ...history, ...sessions }))
  },
  component: Session,
})

function Session() {
  const { id } = Route.useParams()
  const { messages, sessions } = Route.useLoaderData()
  const router = useRouter()
  const transport = useMemo(
    () => createHttpClientTransport({ endpoint: `/api/chat/${id}` }),
    [id],
  )
  const initialMessages = useMemo(() => initialMessagesFromMemory(messages), [messages])
  const chatOptions = useMemo(() => ({
    transport,
    initialMessages,
  }), [initialMessages, transport])
  const chat = useChat(chatOptions)
  const busy = chat.status === 'submitted' || chat.status === 'streaming'
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`response-times:${id}`) ?? '{}') as Record<string, number>
    } catch {
      return {}
    }
  })
  const responseStartedAt = useRef<{ time: number; previousMessageId?: string } | null>(null)

  useEffect(() => {
    sessionStorage.setItem(`response-times:${id}`, JSON.stringify(responseTimes))
  }, [id, responseTimes])

  useEffect(() => {
    if (busy) {
      if (responseStartedAt.current === null) {
        const previousAssistant = [...chat.messages].reverse().find((message) => message.role === 'assistant')
        responseStartedAt.current = { time: performance.now(), previousMessageId: previousAssistant?.id }
      }
      return
    }

    if (responseStartedAt.current === null) return

    const { time, previousMessageId } = responseStartedAt.current
    const durationMs = Math.round(performance.now() - time)
    responseStartedAt.current = null
    const latestAssistant = [...chat.messages].reverse().find((message) => message.role === 'assistant')
    if (latestAssistant && latestAssistant.id !== previousMessageId) {
      setResponseTimes((current) => ({ ...current, [latestAssistant.id]: durationMs }))
    }
  }, [busy, chat.messages])

  useEffect(() => {
    const key = `pending-chat:${id}`
    const prompt = sessionStorage.getItem(key)
    if (!prompt) return

    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(key)
      void chat.sendMessage({ text: prompt }).then(() => router.invalidate())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [chat.sendMessage, id, router])

  return (
    <main className="flex h-dvh bg-white text-slate-900">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={id}
        busySessionId={busy ? id : undefined}
      />
      <ChatProvider controller={chat}>
        <ThreadPrimitive.Root className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b border-slate-100 px-4 md:border-0 md:px-6">
            <h1 className="text-sm font-semibold">PT Bisi HR</h1>
            <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">Demo</span>
          </header>

          <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end">
              <ThreadPrimitive.Empty className="my-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Ada yang bisa saya bantu?</h2>
                <p className="mt-3 text-sm text-slate-500">Tanyakan tentang cuti, jam kerja, penggajian, atau THR.</p>
              </ThreadPrimitive.Empty>

              <ThreadPrimitive.Messages className="space-y-8 pb-6">
                {(message) => (
                  <MessagePrimitive.Root className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'rounded-3xl bg-slate-100 px-5 py-3' : 'w-full px-1 py-2'}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          {message.role === 'user' ? 'Anda' : 'HR PT Bisi'}
                        </p>
                        {message.role === 'user' && (
                          <MessagePrimitive.Copy
                            aria-label="Salin pesan"
                            title="Salin pesan"
                            className="chat-copy-button relative rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                              <rect x="8" y="8" width="12" height="12" rx="2" />
                              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                            </svg>
                            <span className="chat-copy-label" aria-live="polite">Copied</span>
                          </MessagePrimitive.Copy>
                        )}
                      </div>
                      <MessagePrimitive.Content>
                        <MessagePrimitive.Parts
                          className="chat-stream-text space-y-3"
                          filter={(part) => part.type === 'text'}
                          stream={{
                            isStreaming: message.role === 'assistant' && chat.status === 'streaming',
                            resetKey: message.id,
                          }}
                        >
                          <MessagePrimitive.Markdown className="break-words text-sm leading-7 [&_a]:text-blue-700 [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-3 [&_pre]:overflow-x-auto [&_ul]:list-disc" />
                        </MessagePrimitive.Parts>
                      </MessagePrimitive.Content>
                      {message.role === 'assistant' && (
                        <AssistantMessageActions
                          message={message}
                          responseTimeMs={responseTimes[message.id]}
                        />
                      )}
                    </div>
                  </MessagePrimitive.Root>
                )}
              </ThreadPrimitive.Messages>

              <ThreadPrimitive.Loading role="status" className="chat-fade-in mx-auto mt-4 w-full max-w-3xl text-sm text-slate-500">
                Sedang menyiapkan jawaban…
              </ThreadPrimitive.Loading>
            </div>
          </ThreadPrimitive.Viewport>

          <ThreadPrimitive.Error role="alert" className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-red-700">
            Pesan gagal dikirim. Silakan coba lagi.
          </ThreadPrimitive.Error>

          <div className="shrink-0 px-4 pb-4 sm:px-6">
            <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-slate-400">
              <ComposerPrimitive.TextareaInput
                aria-label="Pesan untuk asisten HR"
                placeholder="Tulis pesan"
                rows={1}
                disabled={busy}
                className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-500"
              />
              {busy ? (
                <ComposerPrimitive.Stop className="shrink-0 rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
                  Berhenti
                </ComposerPrimitive.Stop>
              ) : (
                <ComposerPrimitive.Submit className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                  Kirim
                </ComposerPrimitive.Submit>
              )}
            </ComposerPrimitive.Root>
            <p className="mt-2 text-center text-xs text-slate-400">Jawaban AI dapat keliru. Pastikan kebijakan resmi kepada HR.</p>
          </div>
        </ThreadPrimitive.Root>
      </ChatProvider>
    </main>
  )
}

function AssistantMessageActions({
  message,
  responseTimeMs,
}: {
  message: UIMessage
  responseTimeMs?: number
}) {
  const usage = message.generation?.usage
  const contextUsage = message.generation?.contextUsage
  const numberFormat = new Intl.NumberFormat('id-ID')

  return (
    <MessagePrimitive.Actions className="mt-3 flex items-center gap-1 text-slate-500">
      <MessagePrimitive.Copy
        aria-label="Salin jawaban"
        title="Salin jawaban"
        className="chat-copy-button relative rounded-md p-2 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
        <span className="chat-copy-label" aria-live="polite">Copied</span>
      </MessagePrimitive.Copy>

      <details className="relative">
        <summary
          aria-label="Detail pemakaian dan waktu respons"
          title="Detail pemakaian dan waktu respons"
          className="flex size-8 cursor-pointer list-none items-center justify-center rounded-md hover:bg-slate-100 hover:text-slate-800 [&::-webkit-details-marker]:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5m0-8h.01" strokeLinecap="round" />
          </svg>
        </summary>
        <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-lg">
          <h3 className="font-semibold text-slate-900">Detail jawaban</h3>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between gap-3"><dt>Token input</dt><dd>{usage ? numberFormat.format(usage.inputTokens) : 'Tidak tersedia'}</dd></div>
            <div className="flex justify-between gap-3"><dt>Token output</dt><dd>{usage ? numberFormat.format(usage.outputTokens) : 'Tidak tersedia'}</dd></div>
            <div className="flex justify-between gap-3"><dt>Total token</dt><dd>{usage ? numberFormat.format(usage.totalTokens) : 'Tidak tersedia'}</dd></div>
            <div className="flex justify-between gap-3"><dt>Waktu respons</dt><dd>{responseTimeMs === undefined ? 'Belum tercatat' : formatResponseTime(responseTimeMs)}</dd></div>
          </dl>
          {contextUsage ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="font-medium text-slate-900">Context</p>
              <p className="mt-1">{contextUsage.model.modelId}</p>
              <p className="mt-1">
                {numberFormat.format(contextUsage.usedTokens)} / {numberFormat.format(contextUsage.model.context.contextWindow)} token ({contextUsage.usedPercent}%)
              </p>
            </div>
          ) : (
            <p className="mt-3 border-t border-slate-100 pt-3 text-slate-500">Data context tidak tersedia.</p>
          )}
        </div>
      </details>
    </MessagePrimitive.Actions>
  )
}

function formatResponseTime(durationMs: number) {
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} dtk`
}
