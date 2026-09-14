export const PERSON_COLORS = [
  '#FF8A80',
  '#82B1FF',
  '#B39DDB',
  '#80CBC4',
  '#FFD54F',
  '#F48FB1',
  '#A5D6A7',
  '#90CAF9',
  '#CE93D8',
  '#FFCC80',
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
