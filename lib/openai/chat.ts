import { openai } from './client'
import { createServiceClient } from '@/lib/supabase/server'

const tools: any[] = [
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Search the user contacts database',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          is_investor: { type: 'boolean' },
          is_founder: { type: 'boolean' },
          is_recruiter: { type: 'boolean' },
          limit: { type: 'number' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_network_stats',
      description: 'Get total counts and stats about the network',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
]

async function executeTool(name: string, args: any, userId: string) {
  const supabase = createServiceClient()
  if (name === 'search_contacts') {
    let query = supabase
      .from('contacts')
      .select('full_name,job_title,industry,ai_summary,ai_tags,is_investor,is_founder,company:companies(name)')
      .eq('user_id', userId)
      .limit(args.limit || 20)
    if (args.query) query = query.or(`full_name.ilike.%${args.query}%,job_title.ilike.%${args.query}%,industry.ilike.%${args.query}%,ai_summary.ilike.%${args.query}%`)
    if (args.is_investor !== undefined) query = query.eq('is_investor', args.is_investor)
    if (args.is_founder !== undefined) query = query.eq('is_founder', args.is_founder)
    if (args.is_recruiter !== undefined) query = query.eq('is_recruiter', args.is_recruiter)
    const { data } = await query
    return data || []
  }
  if (name === 'get_network_stats') {
    const { data } = await supabase.from('contacts').select('is_investor,is_founder,is_recruiter,industry').eq('user_id', userId)
    if (!data) return {}
    return {
      total: data.length,
      investors: data.filter((c: any) => c.is_investor).length,
      founders: data.filter((c: any) => c.is_founder).length,
      recruiters: data.filter((c: any) => c.is_recruiter).length,
    }
  }
  return null
}

export async function runChat(messages: any[], userId: string, onChunk: (t: string) => void) {
  const system = `You are NetworkBrain, an AI assistant for the user's personal network. Use tools to search real contacts. Only name real people from the database. Format lists as bullet points: "• **Name** — Title at Company". Be concise.`
  let loopMessages = [{ role: 'system', content: system }, ...messages]
  let finalText = ''

  for (let i = 0; i < 5; i++) {
    const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: loopMessages, tools, tool_choice: 'auto' })
    const msg = response.choices[0].message
    if (msg.tool_calls?.length) {
      loopMessages.push(msg)
      for (const tc of msg.tool_calls) {
        const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments), userId)
        loopMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
      }
      continue
    }
    finalText = msg.content || ''
    break
  }

  for (const char of finalText) {
    onChunk(char)
    await new Promise(r => setTimeout(r, 8))
  }
  return finalText
}
