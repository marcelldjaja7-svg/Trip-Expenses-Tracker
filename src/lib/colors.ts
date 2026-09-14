export const PERSON_COLORS = [
  '#f97366',
  '#2dd4bf',
  '#a78bfa',
  '#fbbf24',
  '#38bdf8',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#818cf8',
  '#e879f9',
] as const

export function nextPersonColor(used: string[]): string {
  const taken = new Set(used)
  const unused = PERSON_COLORS.find((c) => !taken.has(c))
  if (unused) return unused
  return PERSON_COLORS[used.length % PERSON_COLORS.length]
}

export const TRIP_EMOJIS = [
  '🏝️',
  '🏔️',
  '🗼',
  '🎒',
  '✈️',
  '🚂',
  '🏖️',
  '🏕️',
  '🍜',
  '🎿',
  '🗺️',
  '🌅',
  '🎢',
  '🛶',
  '🌺',
  '🗽',
  '🕌',
  '🏯',
  '🌋',
  '🥳',
] as const
