import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enrichBatch } from '@/lib/openai/enrich'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  const { data: contacts } = await service.from('contacts')
    .select('id,full_name,job_title,industry,location,company:companies(name)')
    .eq('user_id', user.id).is('ai_summary', null).limit(50)
  if (!contacts?.length) return NextResponse.json({ enriched: 0 })
  await enrichBatch(contacts, service)
  return NextResponse.json({ enriched: contacts.length })
}
