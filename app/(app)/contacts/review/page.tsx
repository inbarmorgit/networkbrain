import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type FieldConflict = { source: string; value: string; discarded_at: string }

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  job_title: 'Job title',
  linkedin_url: 'LinkedIn',
  location: 'Location',
  industry: 'Industry',
  notes: 'Notes',
  company_id: 'Company',
}

const SOURCE_BADGE: Record<string, string> = {
  linkedin: 'bg-blue-50 text-blue-700 border-blue-200',
  phone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manual: 'bg-gray-100 text-gray-600 border-gray-200',
}
function sourceBadgeClass(source: string) {
  return SOURCE_BADGE[source] || 'bg-gray-100 text-gray-600 border-gray-200'
}

function currentValueFor(field: string, c: any): string {
  if (field === 'company_id') return c.company?.name || '—'
  return c[field] || '—'
}

export default async function ContactsReviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allContacts } = await supabase.from('contacts')
    .select('id,full_name,email,phone,job_title,linkedin_url,location,industry,notes,sources,field_sources,field_conflicts,company:companies(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const contacts = (allContacts || []).filter((c: any) =>
    (c.sources?.length ?? 0) > 1 || Object.keys(c.field_conflicts || {}).length > 0
  )
  const conflictCount = contacts.filter((c: any) => Object.keys(c.field_conflicts || {}).length > 0).length

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/contacts" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Contacts</Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Cross-source review</h1>
        <p className="text-gray-500 mt-0.5">
          {contacts.length} contact{contacts.length === 1 ? '' : 's'} merged from multiple sources
          {conflictCount > 0 && (
            <span className="text-amber-600"> · {conflictCount} with conflicts worth a look</span>
          )}
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3">🔀</div>
          <p className="font-medium">No multi-source contacts yet</p>
          <p className="text-sm mt-1">Import from a second source (e.g. a vCard after a LinkedIn CSV) to see merges here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((c: any) => {
            const fieldSources: Record<string, string> = c.field_sources || {}
            const fieldConflicts: Record<string, FieldConflict[]> = c.field_conflicts || {}
            const rows: [string, string][] = [
              ['email', c.email], ['phone', c.phone], ['job_title', c.job_title],
              ['linkedin_url', c.linkedin_url], ['location', c.location],
              ['industry', c.industry], ['notes', c.notes],
              ['company_id', c.company?.name],
            ].filter(([, v]) => v) as [string, string][]

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                        {(c.full_name || '?')[0].toUpperCase()}
                      </div>
                      <Link href={`/contacts/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {c.full_name}
                      </Link>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {(c.sources || []).map((s: string) => (
                        <span key={s} className={`text-xs px-2.5 py-1 rounded-full border capitalize ${sourceBadgeClass(s)}`}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {rows.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {rows.map(([field, value]) => (
                        <div key={field} className="flex items-baseline justify-between gap-2 border-b border-gray-50 pb-1.5">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">{FIELD_LABELS[field] || field}</p>
                            <p className="text-gray-700 truncate">{value}</p>
                          </div>
                          {fieldSources[field] && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0 ${sourceBadgeClass(fieldSources[field])}`}>
                              {fieldSources[field]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {Object.keys(fieldConflicts).length > 0 && (
                  <div className="bg-amber-50 border-t border-amber-100 px-5 py-4">
                    <p className="text-xs font-medium text-amber-700 mb-2">⚠ Conflicting values discarded during merge</p>
                    <div className="space-y-1.5">
                      {Object.entries(fieldConflicts).map(([field, entries]) => (
                        <p key={field} className="text-sm">
                          <span className="text-gray-500">{FIELD_LABELS[field] || field}: </span>
                          <span className="text-gray-900">kept &ldquo;{currentValueFor(field, c)}&rdquo;</span>
                          {entries.map((e, i) => (
                            <span key={i} className="text-gray-500"> · {e.source} had &ldquo;{e.value}&rdquo;</span>
                          ))}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
