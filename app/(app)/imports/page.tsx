import ImportWizard from '@/components/import/ImportWizard'
import { createClient } from '@/lib/supabase/server'

export default async function ImportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: imports } = await supabase.from('imports').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10)

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Import contacts</h1>
        <p className="text-gray-500 mt-1">Upload your LinkedIn connections CSV</p>
      </div>
      <ImportWizard />
      {imports && imports.length > 0 && (
        <div className="mt-10">
          <h2 className="font-medium text-gray-900 mb-4">Import history</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {imports.map((imp: any) => (
              <div key={imp.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{imp.source_type} import</p>
                  <p className="text-xs text-gray-400">{new Date(imp.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">{imp.imported_rows} contacts</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${imp.status==='done'?'bg-emerald-50 text-emerald-600':imp.status==='error'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}`}>{imp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
