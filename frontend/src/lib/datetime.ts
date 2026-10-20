/** ISO string → value for a `datetime-local` input, in the browser's timezone. */
export function toInputValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `datetime-local` value → ISO string (UTC) for the API. */
export function fromInputValue(value: string): string {
  return new Date(value).toISOString()
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "Jul 10, 2026, 10:00 AM – 12:00 PM" (end date shown only when it differs). */
export function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  return `${dateTimeFormat.format(start)} – ${sameDay ? timeFormat.format(end) : dateTimeFormat.format(end)}`
}

/** "2 hr 30 min" between two dates, or null when the range is empty or invalid. */
export function calculateDuration(start: string, end: string): string | null {
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  if (diffMs <= 0 || isNaN(diffMs)) return null

  const diffMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60

  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`
  if (hours > 0) return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
  return `${mins} min`
}
