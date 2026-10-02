// Minimal vCard 3.0/4.0 parser covering the fields exported by iCloud/Google
// Contacts (FN, N, TEL, EMAIL, ORG, TITLE, URL, ADR, NOTE). Not a full spec
// implementation. Returns contacts already keyed by the app's target field
// names (first_name, last_name, email, ...) — unlike CSV import, vCard field
// names are standardized, so there's no user-driven column mapping step;
// callers can pass an identity mapping straight into the same import route.

export type VCardContact = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
  job_title?: string
  linkedin_url?: string
  location?: string
  notes?: string
}

export const VCARD_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'company_name', 'job_title', 'linkedin_url', 'location', 'notes',
] as const

export function parseVCardFile(file: File): Promise<VCardContact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(parseVCard(e.target?.result as string))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function parseVCard(text: string): VCardContact[] {
  // Unfold continuation lines: per the vCard spec, a line starting with a
  // space or tab is a continuation of the previous line.
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1)

  return blocks.map((block) => {
    const fields: Record<string, string> = {}
    for (const line of block.split(/\r?\n/)) {
      if (/^END:VCARD/i.test(line)) break
      if (!line) continue
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue
      const key = line.slice(0, colonIndex).split(';')[0].toUpperCase()
      const value = line.slice(colonIndex + 1).trim()
      // A vCard can have several TEL/EMAIL lines (home, work, mobile…); the
      // contacts table only has one phone/email column, so — same as the
      // CSV path — keep the first of each rather than the last.
      if (value && !(key in fields)) fields[key] = value
    }

    let first_name: string | undefined
    let last_name: string | undefined
    if (fields['N']) {
      // N = Family;Given;Middle;Prefix;Suffix
      const [family, given] = fields['N'].split(';')
      last_name = family?.trim() || undefined
      first_name = given?.trim() || undefined
    }
    if (!first_name && !last_name && fields['FN']) {
      const spaceIdx = fields['FN'].indexOf(' ')
      if (spaceIdx === -1) {
        first_name = fields['FN'].trim()
      } else {
        first_name = fields['FN'].slice(0, spaceIdx).trim()
        last_name = fields['FN'].slice(spaceIdx + 1).trim()
      }
    }

    let location: string | undefined
    if (fields['ADR']) {
      // ADR = PO Box;Extended;Street;Locality;Region;PostalCode;Country
      const adr = fields['ADR'].split(';')
      location = [adr[3]?.trim(), adr[4]?.trim()].filter(Boolean).join(', ') || undefined
    }

    const contact: VCardContact = {
      first_name,
      last_name,
      email: fields['EMAIL']?.trim() || undefined,
      phone: fields['TEL']?.trim() || undefined,
      company_name: fields['ORG']?.split(';')[0]?.trim() || undefined,
      job_title: fields['TITLE']?.trim() || undefined,
      linkedin_url: fields['URL']?.trim() || undefined,
      location,
      notes: fields['NOTE']?.trim() || undefined,
    }
    return contact
  })
}
