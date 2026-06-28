import { openai } from './client'

export interface EnrichmentResult {
  summary: string
  tags: string[]
  is_investor: boolean
  is_founder: boolean
  is_recruiter: boolean
  industry: string
  expertise_areas: string[]
  priority_score: number
}

export async function enrichContact(contact: {
  full_name?: string; job_title?: string; company?: string; industry?: string
}): Promise<EnrichmentResult | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Return JSON with: summary (one sentence, max 20 words), tags (2-5 keywords), is_investor (bool), is_founder (bool), is_recruiter (bool), industry (string), expertise_areas (1-3 items), priority_score (0-100, C-level/founder/investor=80+, VP=65+, Manager=50, IC=40). JSON only, no markdown.`
        },
        {
          role: 'user',
          content: `Name: ${contact.full_name || 'Unknown'}\nTitle: ${contact.job_title || 'Unknown'}\nCompany: ${contact.company || 'Unknown'}\nIndustry: ${contact.industry || 'Unknown'}`
        }
      ]
    })
    const text = response.choices[0]?.message?.content
    if (!text) return null
    return JSON.parse(text) as EnrichmentResult
  } catch { return null }
}

export async function enrichBatch(contacts: any[], supabase: any) {
  for (const contact of contacts) {
    const result = await enrichContact({
      full_name: contact.full_name,
      job_title: contact.job_title,
      company: contact.company?.name,
      industry: contact.industry,
    })
    if (!result) continue
    await supabase.from('contacts').update({
      ai_summary: result.summary,
      ai_tags: result.tags,
      is_investor: result.is_investor,
      is_founder: result.is_founder,
      is_recruiter: result.is_recruiter,
      industry: contact.industry || result.industry,
      expertise_areas: result.expertise_areas,
      priority_score: result.priority_score,
    }).eq('id', contact.id)
    await new Promise(r => setTimeout(r, 150))
  }
}
