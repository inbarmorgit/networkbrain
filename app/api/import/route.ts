import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows, mapping, sourceType } = await req.json()
  const service = createServiceClient()

  const { data: importRecord } = await service.from('imports').insert({
    user_id: user.id, source_type: sourceType || 'unknown', total_rows: rows.length, status: 'processing'
  }).select().single()

  let imported = 0, skipped = 0
  const companyCache: Record<string, string> = {}
  const BATCH = 50

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const toInsert = []
    for (const row of batch) {
      const mapped: Record<string,any> = {}
      for (const [csvH, field] of Object.entries(mapping as Record<string,string>)) {
        if (field && row[csvH]) mapped[field] = row[csvH]
      }
      if (!mapped.first_name && !mapped.last_name && !mapped.email) { skipped++; continue }

      let companyId: string | null = null
      if (mapped.company_name) {
        const cn = mapped.company_name.trim()
        if (companyCache[cn]) {
          companyId = companyCache[cn]
        } else {
          const { data: ex } = await service.from('companies').select('id').ilike('name', cn).limit(1).maybeSingle()
          if (ex) { companyId = ex.id } else {
            const { data: nc } = await service.from('companies').insert({ name: cn }).select('id').single()
            companyId = nc?.id || null
          }
          if (companyId) companyCache[cn] = companyId
        }
      }
      toInsert.push({
        user_id: user.id,
        first_name: mapped.first_name || null,
        last_name: mapped.last_name || null,
        email: mapped.email || null,
        phone: mapped.phone || null,
        job_title: mapped.job_title || null,
        linkedin_url: mapped.linkedin_url || null,
        location: mapped.location || null,
        industry: mapped.industry || null,
        notes: mapped.notes || null,
        company_id: companyId,
        source: sourceType || 'manual',
      })
    }
    if (toInsert.length > 0) {
      await service.from('contacts').insert(toInsert)
      imported += toInsert.length
    }
  }

  await service.from('imports').update({ imported_rows: imported, skipped_rows: skipped, status: 'done' }).eq('id', importRecord?.id)
  return NextResponse.json({ imported, skipped })
}
