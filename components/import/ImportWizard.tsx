'use client'
import { useState } from 'react'
import { parseCSV, detectSourceType, autoMapHeaders } from '@/lib/utils/csv'

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

const FIELDS = [
  { value: '', label: '— skip —' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company_name', label: 'Company name' },
  { value: 'job_title', label: 'Job title' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'location', label: 'Location' },
  { value: 'industry', label: 'Industry' },
  { value: 'notes', label: 'Notes' },
]

export default function ImportWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string,string>>({})
  const [sourceType, setSourceType] = useState('unknown')
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<{imported:number;skipped:number}|null>(null)
  const [error, setError] = useState('')
  const [enriching, setEnriching] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file'); return }
    const { headers, rows } = await parseCSV(file)
    setHeaders(headers); setRows(rows)
    setSourceType(detectSourceType(headers))
    setMapping(autoMapHeaders(headers))
    setError(''); setStep('map')
  }

  async function runImport() {
    setStep('importing')
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, mapping, sourceType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult({ imported: data.imported, skipped: data.skipped })
      setStep('done')
      setEnriching(true)
      fetch('/api/enrich', { method: 'POST' }).finally(() => setEnriching(false))
    } catch (err: any) { setError(err.message); setStep('map') }
  }

  const stepNum = { upload:1, map:2, preview:3, importing:3, done:4 }[step]

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {['Upload','Map','Preview','Done'].map((s,i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${stepNum > i+1 ? 'bg-blue-100 text-blue-600' : stepNum === i+1 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{i+1}</div>
            <span className={`text-sm hidden sm:inline ${stepNum===i+1?'text-gray-900 font-medium':'text-gray-400'}`}>{s}</span>
            {i<3 && <div className="w-6 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      {step === 'upload' && (
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f)}}
          onClick={()=>document.getElementById('csv-input')?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging?'border-brand-400 bg-brand-50':'border-gray-300 hover:border-gray-400'}`}>
          <div className="text-4xl mb-3">📄</div>
          <h3 className="font-medium text-gray-900 mb-1">Drop your LinkedIn CSV here</h3>
          <p className="text-sm text-gray-400 mb-4">Or click to browse — upload Connections.csv from LinkedIn</p>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
        </div>
      )}

      {step === 'map' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Map columns</h3>
            <p className="text-sm text-gray-400">{rows.length} rows · detected: {sourceType}</p>
          </div>
          <div className="p-5 space-y-2.5 max-h-80 overflow-y-auto">
            {headers.map(h => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-44 truncate flex-shrink-0">{h}</span>
                <span className="text-gray-300 text-xs">→</span>
                <select value={mapping[h]||''} onChange={e=>setMapping(p=>({...p,[h]:e.target.value}))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-between">
            <button onClick={()=>setStep('upload')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <button onClick={()=>setStep('preview')} className="px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">Preview →</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Preview — first 5 of {rows.length} rows</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {Object.entries(mapping).filter(([,v])=>v).map(([h,field])=>(
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">
                    {FIELDS.find(f=>f.value===field)?.label||field}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {rows.slice(0,5).map((row,i)=>(
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    {Object.entries(mapping).filter(([,v])=>v).map(([h])=>(
                      <td key={h} className="px-4 py-2.5 text-gray-700 max-w-xs truncate whitespace-nowrap">
                        {row[h]||<span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-between">
            <button onClick={()=>setStep('map')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <button onClick={runImport} className="px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
              Import {rows.length} contacts →
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-gray-900">Importing {rows.length} contacts…</p>
          <p className="text-sm text-gray-400 mt-1">This may take a minute</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">Import complete!</h3>
          <p className="text-gray-500 mb-1">{result.imported} contacts imported · {result.skipped} skipped</p>
          {enriching && <p className="text-sm text-brand-600 mt-2">🤖 AI is enriching your contacts in the background…</p>}
          <div className="flex gap-3 justify-center mt-5">
            <a href="/contacts" className="px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">View contacts →</a>
            <button onClick={()=>{setStep('upload');setResult(null);setHeaders([]);setRows([]);setMapping({})}}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Import more</button>
          </div>
        </div>
      )}
    </div>
  )
}
