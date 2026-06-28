'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ContactsClient({ contacts }: { contacts: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(searchParams.get('q') || '')

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    startTransition(() => router.push(`/contacts?${params.toString()}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilter('q', q)
  }

  const strength = searchParams.get('strength')
  const investor = searchParams.get('investor')
  const founder = searchParams.get('founder')

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-0.5">{contacts.length} contacts</p>
        </div>
        <Link href="/imports" className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
          + Import
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <form onSubmit={handleSearch} className="flex gap-3 mb-3">
          <input type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name, title, company, industry…"
            className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">Search</button>
          {searchParams.toString() && (
            <button type="button" onClick={() => { setQ(''); router.push('/contacts') }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">Clear</button>
          )}
        </form>
        <div className="flex flex-wrap gap-2">
          {(['strong','medium','weak'] as const).map(s => (
            <button key={s} onClick={() => applyFilter('strength', strength === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${strength === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'}`}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
          <button onClick={() => applyFilter('investor', investor === 'true' ? '' : 'true')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${investor === 'true' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'}`}>
            Investors
          </button>
          <button onClick={() => applyFilter('founder', founder === 'true' ? '' : 'true')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${founder === 'true' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'}`}>
            Founders
          </button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-medium">No contacts found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {contacts.map(c => (
            <Link key={c.id} href={`/contacts/${c.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                {(c.full_name||c.first_name||'?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">{c.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{[c.job_title, c.company?.name].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                {c.is_investor && <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Investor</span>}
                {c.is_founder && <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">Founder</span>}
                {c.industry && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c.industry}</span>}
              </div>
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${c.relationship_strength==='strong'?'bg-emerald-400':c.relationship_strength==='medium'?'bg-amber-400':'bg-gray-300'}`} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
