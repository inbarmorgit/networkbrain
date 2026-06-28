import { createClient } from '@/lib/supabase/server'
import ContactsClient from '@/components/contacts/ContactsClient'

export default async function ContactsPage({ searchParams }: { searchParams: any }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from('contacts')
    .select('id,full_name,first_name,last_name,job_title,industry,ai_summary,ai_tags,is_investor,is_founder,is_recruiter,relationship_strength,priority_score,company:companies(name)')
    .eq('user_id', user!.id)
    .order('priority_score', { ascending: false })
    .limit(200)

  if (searchParams.q) {
    query = query.or(`full_name.ilike.%${searchParams.q}%,job_title.ilike.%${searchParams.q}%,industry.ilike.%${searchParams.q}%,ai_summary.ilike.%${searchParams.q}%`)
  }
  if (searchParams.strength) query = query.eq('relationship_strength', searchParams.strength)
  if (searchParams.investor === 'true') query = query.eq('is_investor', true)
  if (searchParams.founder === 'true') query = query.eq('is_founder', true)

  const { data: contacts } = await query
  return <ContactsClient contacts={contacts || []} />
}
