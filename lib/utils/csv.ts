import Papa from 'papaparse'

export function parseCSV(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      let text = e.target?.result as string
      const lines = text.split('\n')
      if (lines[0]?.startsWith('Notes:') || lines[0]?.startsWith('"Notes:')) {
        text = lines.slice(3).join('\n')
      }
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || []
          resolve({ headers, rows: results.data as Record<string, string>[] })
        },
        error: reject,
      })
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function detectSourceType(headers: string[]): 'linkedin' | 'phone' | 'unknown' {
  const h = headers.map(h => h.toLowerCase())
  if (h.includes('connected on') || h.some(x => x.includes('linkedin'))) return 'linkedin'
  if (h.includes('phone 1 - value') || h.includes('mobile phone')) return 'phone'
  return 'unknown'
}

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const rules: [RegExp, string][] = [
    [/first.?name/i, 'first_name'],
    [/last.?name/i, 'last_name'],
    [/email/i, 'email'],
    [/phone|mobile/i, 'phone'],
    [/company|organization/i, 'company_name'],
    [/position|title|job/i, 'job_title'],
    [/^url$/i, 'linkedin_url'],
    [/linkedin/i, 'linkedin_url'],
    [/location|city/i, 'location'],
    [/industry/i, 'industry'],
    [/note/i, 'notes'],
    [/connected.?on/i, ''],
  ]
  for (const header of headers) {
    for (const [pattern, field] of rules) {
      if (pattern.test(header) && (field === '' || !Object.values(mapping).includes(field))) {
        mapping[header] = field
        break
      }
    }
  }
  return mapping
}
