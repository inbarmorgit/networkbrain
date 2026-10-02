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

  let inserted = 0, merged = 0, skipped = 0
  const companyCache: Record<string, string> = {}
  const source = sourceType || 'manual'

  for (const row of rows) {
    const mapped: Record<string,any> = {}
    for (const [csvH, field] of Object.entries(mapping as Record<string,string>)) {
      if (field && row[csvH]) mapped[field] = row[csvH]
    }
    // Accept phone-only rows (e.g. phone exports with no name/email on some
    // entries) in addition to the existing name/email requirement.
    if (!mapped.first_name && !mapped.last_name && !mapped.email && !mapped.phone) { skipped++; continue }

    // No name at all: fall back to the phone number as the display name.
    // Safe for merges too — import_upsert_contact() only fills empty
    // fields, so a real name already on the matched contact wins.
    if (!mapped.first_name && !mapped.last_name && mapped.phone) {
      mapped.first_name = mapped.phone
    }

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

    const { data: result, error } = await service.rpc('import_upsert_contact', {
      p_user_id: user.id,
      p_first_name: mapped.first_name || null,
      p_last_name: mapped.last_name || null,
      p_email: mapped.email || null,
      p_phone: mapped.phone || null,
      p_job_title: mapped.job_title || null,
      p_linkedin_url: mapped.linkedin_url || null,
      p_location: mapped.location || null,
      p_industry: mapped.industry || null,
      p_notes: mapped.notes || null,
      p_company_id: companyId,
      p_source: source,
    }).single() as { data: { contact_id: string; action: string } | null; error: any }

    if (error || !result) { skipped++; continue }
    if (result.action === 'merged') merged++; else inserted++
  }

  const imported = inserted + merged
  await service.from('imports').update({ imported_rows: imported, skipped_rows: skipped, status: 'done' }).eq('id', importRecord?.id)
  return NextResponse.json({ imported, inserted, merged, skipped })
}
