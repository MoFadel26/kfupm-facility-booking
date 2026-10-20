/** Turns an API enum value into a label: "SportsCourt" -> "Sports court". */
export function humanize(value: string): string {
  const words = value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
