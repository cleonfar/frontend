export type AiSummary = {
  highPerformers: string[]
  lowPerformers: string[]
  concerningTrends: string[]
  averagePerformers: string[]
  potentialRecordErrors: string[]
  insufficientData: string[]
  insights?: string
}

function itemToLabel(x: any): string {
  if (x == null) return ''
  if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') return String(x)
  if (typeof x === 'object') {
    const cand = (x as any)
    const id = cand.animalId ?? cand.motherId ?? cand.externalId ?? cand.id ?? cand.name ?? cand.code
    if (id != null) return String(id)
    // Compact string for unknown objects
    try { return JSON.stringify(cand) } catch { return '[object]' }
  }
  return String(x)
}

function toStrArray(val: any): string[] {
  if (val == null) return []
  if (Array.isArray(val)) return val.map(itemToLabel).filter(Boolean)
  return [itemToLabel(val)].filter(Boolean)
}

function looksLikeSummary(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const keys = [
    'highPerformers','lowPerformers','concerningTrends','averagePerformers','potentialRecordErrors','insufficientData','insights'
  ]
  return keys.some(k => k in obj)
}

export function normalizeAiSummary(input: any): AiSummary | null {
  // If string, attempt to parse JSON; if fails, treat as insights-only
  if (typeof input === 'string') {
    const s = input.trim()
    if (!s) return null
    try {
      const parsed = JSON.parse(s)
      return normalizeAiSummary(parsed)
    } catch {
      return {
        highPerformers: [], lowPerformers: [], concerningTrends: [], averagePerformers: [], potentialRecordErrors: [], insufficientData: [], insights: s
      }
    }
  }
  // If wrapped in { data: { ... } } or { summary: { ... } }
  if (input && typeof input === 'object') {
    const obj: any = input
    if ('data' in obj && obj.data && typeof obj.data === 'object') {
      const res = normalizeAiSummary(obj.data)
      if (res) return res
    }
    if ('summary' in obj) {
      const res = normalizeAiSummary(obj.summary)
      if (res) return res
    }
    if (looksLikeSummary(obj)) {
      return {
        highPerformers: toStrArray((obj as any).highPerformers),
        lowPerformers: toStrArray((obj as any).lowPerformers),
        concerningTrends: toStrArray((obj as any).concerningTrends),
        averagePerformers: toStrArray((obj as any).averagePerformers),
        potentialRecordErrors: toStrArray((obj as any).potentialRecordErrors),
        insufficientData: toStrArray((obj as any).insufficientData),
        insights: typeof (obj as any).insights === 'string' ? (obj as any).insights : itemToLabel((obj as any).insights)
      }
    }
  }
  return null
}
