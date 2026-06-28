import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ContactPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: c } = await supabase.from('contacts').select('*, company:companies(name,industry)').eq('id', params.id).single()
  if (!c || c.user_id !== user!.id) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/contacts" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← Contacts</Link>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xl font-semibold flex-shrink-0">
            {(c.full_name||'?')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{c.full_name}</h1>
            <p className="text-gray-500">{[c.job_title, c.company?.name].filter(Boolean).join(' at ')}</p>
            {c.location && <p className="text-sm text-gray-400 mt-0.5">📍 {c.location}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {c.is_investor && <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">Investor</span>}
            {c.is_founder && <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">Founder</span>}
          </div>
        </div>
        {c.ai_summary && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs font-medium text-blue-600 mb-1">AI summary</p>
            <p className="text-sm text-gray-700">{c.ai_summary}</p>
          </div>
        )}
        {c.ai_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {c.ai_tags.map((tag: string) => <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{tag}</span>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {c.email && <div><p className="text-xs text-gray-400 mb-0.5">Email</p><a href={`mailto:${c.email}`} className="text-brand-600 hover:underline truncate block">{c.email}</a></div>}
          {c.industry && <div><p className="text-xs text-gray-400 mb-0.5">Industry</p><p className="text-gray-700">{c.industry}</p></div>}
          {c.relationship_strength && <div><p className="text-xs text-gray-400 mb-0.5">Relationship</p><p className="text-gray-700 capitalize">{c.relationship_strength}</p></div>}
          {c.linkedin_url && <div><p className="text-xs text-gray-400 mb-0.5">LinkedIn</p><a href={c.linkedin_url} target="_blank" rel="noopener" className="text-brand-600 hover:underline">View profile</a></div>}
        </div>
        {c.notes && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{c.notes}</p></div>}
      </div>
    </div>
  )
}
