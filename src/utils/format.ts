// Shared formatting utilities

/**
 * Format a date-like value as Day Month Year (e.g., 28 Oct 2025).
 * - Accepts Date, number (ms), or string (YYYY-MM-DD, ISO, etc.)
 * - Avoids timezone off-by-one for plain YYYY-MM-DD by constructing a local Date.
 */
export function formatDateDMY(input: string | number | Date | null | undefined): string {
  if (input == null || input === '') return ''
  let d: Date | null = null
  if (input instanceof Date) {
    d = input
  } else if (typeof input === 'number') {
    d = new Date(input)
  } else if (typeof input === 'string') {
    const s = input.trim()
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]); const da = Number(m[3])
      d = new Date(y, mo - 1, da) // local date to avoid TZ shift
    } else {
      const parsed = new Date(s)
      d = isNaN(parsed.getTime()) ? null : parsed
    }
  }
  if (!d) return ''
  // Use en-GB to ensure Day-Month-Year order
  const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return fmt.format(d)
}

/**
 * Format a date-like value as Month Day, Year (e.g., Oct 28, 2025).
 * Safely handles YYYY-MM-DD without timezone shifts.
 */
export function formatDateMDY(input: string | number | Date | null | undefined): string {
  if (input == null || input === '') return ''
  let d: Date | null = null
  if (input instanceof Date) {
    d = input
  } else if (typeof input === 'number') {
    d = new Date(input)
  } else if (typeof input === 'string') {
    const s = input.trim()
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]); const da = Number(m[3])
      d = new Date(y, mo - 1, da)
    } else {
      const parsed = new Date(s)
      d = isNaN(parsed.getTime()) ? null : parsed
    }
  }
  if (!d) return ''
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  return fmt.format(d)
}
