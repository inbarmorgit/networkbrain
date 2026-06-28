'use client'
import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

const PROMPTS = [
  'Who do I know in cybersecurity?',
  'Which investors are in my network?',
  'Who are the founders I know?',
  'How many contacts do I have?',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streaming])

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreaming('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error('failed')
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setStreaming(full)
      }
      setMessages([...newMessages, { role: 'assistant', content: full }])
      setStreaming('')
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  function fmt(text: string) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="max-w-xl mx-auto mt-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">💬</div>
              <h2 className="font-semibold text-gray-900 mb-1">Ask about your network</h2>
              <p className="text-sm text-gray-400">I search your real contacts and answer in plain language</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2.5 flex-shrink-0 mt-0.5">AI</div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
              {msg.role === 'assistant' ? <div className="prose-chat" dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} /> : msg.content}
            </div>
          </div>
        ))}
        {(streaming || (loading && !streaming)) && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2.5 mt-0.5">AI</div>
            <div className="max-w-xl px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm text-gray-800">
              {streaming ? <><div className="prose-chat" dangerouslySetInnerHTML={{ __html: fmt(streaming) }} /><span className="inline-block w-1 h-3.5 bg-brand-500 ml-0.5 animate-pulse rounded-sm" /></> :
                <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Who do I know in…" disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50" />
          <button type="submit" disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors">Send</button>
        </form>
      </div>
    </div>
  )
}
