import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: contacts } = await supabase.from('contacts').select('id,is_investor,is_founder,is_recruiter,priority_score,full_name,job_title').eq('user_id', user!.id)
  const total = contacts?.length || 0
  const investors = contacts?.filter(c => c.is_investor).length || 0
  const founders = contacts?.filter(c => c.is_founder).length || 0
  const top = contacts?.sort((a,b) => (b.priority_score||0)-(a.priority_score||0)).slice(0,5) || []

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your network at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total contacts', value: total, color: 'text-blue-600' },
          { label: 'Investors', value: investors, color: 'text-emerald-600' },
          { label: 'Founders', value: founders, color: 'text-violet-600' },
          { label: 'Recruiters', value: contacts?.filter(c=>c.is_recruiter).length||0, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      {total === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">📥</div>
          <h2 className="font-semibold text-gray-900 mb-2">No contacts yet</h2>
          <p className="text-gray-500 text-sm mb-5">Import your LinkedIn connections to get started</p>
          <Link href="/imports" className="inline-flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            Import contacts →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-medium text-gray-900 mb-4">Quick actions</h2>
            <div className="space-y-2">
              {[
                { href: '/chat', label: 'Ask AI about your network', icon: '💬', desc: 'Who do I know in cybersecurity?' },
                { href: '/contacts', label: 'Browse contacts', icon: '👥', desc: `${total} contacts` },
                { href: '/imports', label: 'Import more', icon: '📥', desc: 'LinkedIn or phone CSV' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">{a.label}</p>
                    <p className="text-xs text-gray-400">{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          {top.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-medium text-gray-900 mb-4">Top connections</h2>
              <div className="space-y-3">
                {top.map((c: any) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                      {(c.full_name||'?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.job_title}</p>
                    </div>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c.priority_score}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
