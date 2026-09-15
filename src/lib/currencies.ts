export type CurrencyInfo = {
  code: string
  name: string
  symbol: string
  decimals: number
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimals: 0 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimals: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimals: 2 },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
]

export const DEFAULT_BASE_CURRENCY = 'IDR'

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]))

export function getCurrency(code: string): CurrencyInfo {
  return BY_CODE.get(code) ?? { code, name: code, symbol: code, decimals: 2 }
}

export function currencyDecimals(code: string): number {
  return getCurrency(code).decimals
}

/**
 * Starter rates: units of USD per 1 unit of the currency.
 * Manual and editable — these are only convenient defaults.
 */
export const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  IDR: 1 / 16200,
  SGD: 0.74,
  MYR: 0.225,
  THB: 0.029,
  JPY: 0.0067,
  AUD: 0.65,
  CAD: 0.73,
  CHF: 1.12,
  CNY: 0.14,
  HKD: 0.128,
  INR: 0.012,
  KRW: 0.00072,
  NZD: 0.6,
  PHP: 0.0175,
  VND: 1 / 25500,
  ISK: 0.0073,
  DKK: 0.145,
  NOK: 0.092,
  SEK: 0.095,
  PLN: 0.25,
  CZK: 0.043,
  HUF: 0.0027,
  RON: 0.22,
  BGN: 0.55,
  TRY: 0.029,
  BRL: 0.18,
  MXN: 0.055,
  AED: 0.2723,
  SAR: 0.2666,
  ILS: 0.27,
  TWD: 0.031,
  ZAR: 0.055,
}

export function ratesForBase(base: string): Record<string, number> {
  const usdPerBase = USD_RATES[base] ?? 1
  const rates: Record<string, number> = {}
  for (const code of Object.keys(USD_RATES)) {
    const usdPerCode = USD_RATES[code] ?? 1
    rates[code] = usdPerCode / usdPerBase
  }
  rates[base] = 1
  return roundRates(rates)
}

export function convertRatesToNewBase(
  rates: Record<string, number>,
  newBase: string,
): Record<string, number> {
  const factor = rates[newBase]
  if (!factor || factor <= 0) {
    return { ...ratesForBase(newBase), ...rates, [newBase]: 1 }
  }
  const next: Record<string, number> = {}
  for (const [code, value] of Object.entries(rates)) {
    next[code] = value / factor
  }
  next[newBase] = 1
  return roundRates(next)
}

function roundRates(rates: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {}
  for (const [code, value] of Object.entries(rates)) {
    if (!Number.isFinite(value) || value <= 0) continue
    next[code] = Number(value.toPrecision(8))
  }
  return next
}

export async function fetchLiveRates(base: string): Promise<Record<string, number> | null> {
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { rates?: Record<string, number> }
    if (!data.rates) return null
    const rates: Record<string, number> = { [base]: 1 }
    for (const [code, value] of Object.entries(data.rates)) {
      if (typeof value === 'number' && value > 0) {
        rates[code] = Number((1 / value).toPrecision(8))
      }
    }
    return rates
  } catch {
    return null
  }
}
