/**
 * Auto-translate service/category/problem names
 * Uses MyMemory Translation API — FREE, no API key required
 */

const MYMEMORY_EMAIL = process.env.TRANSLATE_EMAIL || ''

async function translateText(text, from, to) {
  if (!text?.trim() || from === to) return text
  try {
    const params = new URLSearchParams({ q: text, langpair: `${from}|${to}` })
    if (MYMEMORY_EMAIL) params.set('de', MYMEMORY_EMAIL)
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return text
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const t = data.responseData.translatedText
      if (t.startsWith('MYMEMORY WARNING')) return text
      return t
    }
    return text
  } catch {
    return text
  }
}

function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(text)
}

/**
 * Detect if text is a proper noun / brand / abbreviation that should NOT be translated.
 * Rules:
 *   1. All uppercase (e.g. "RO", "AC", "TV") — abbreviations
 *   2. 1-2 characters (any case)
 *   3. Contains digits (model numbers like "RO 75G")
 *   4. Known appliance/brand names that look like English but are product names
 */
function shouldSkipTranslation(text) {
  const trimmed = text.trim()
  // All uppercase word(s) — abbreviation like RO, AC, TV, LED
  if (/^[A-Z0-9\s\-\.]+$/.test(trimmed)) return true
  // Very short (1-2 chars)
  if (trimmed.length <= 2) return true
  // Contains digits — model/product names
  if (/\d/.test(trimmed)) return true
  return false
}

async function fillTranslations(name, nameHindi, nameHinglish) {
  // All three provided → trust admin, skip API
  if (name && nameHindi && nameHinglish) {
    return { name, nameHindi, nameHinglish }
  }

  const source = name || nameHinglish || nameHindi || ''
  if (!source.trim()) return { name: source, nameHindi: source, nameHinglish: source }

  // If it's an abbreviation/brand name → keep same across all languages
  if (shouldSkipTranslation(source)) {
    return {
      name:         source,
      nameHindi:    source,
      nameHinglish: source,
    }
  }

  const sourceIsHindi = isDevanagari(source)
  let en = name || nameHinglish || null
  let hi = nameHindi || null

  if (sourceIsHindi) {
    hi = hi || source
    if (!en) en = await translateText(source, 'hi', 'en')
  } else {
    en = en || source
    if (!hi) hi = await translateText(source, 'en', 'hi')
  }

  return {
    name:         en  || source,
    nameHindi:    hi  || source,
    nameHinglish: en  || source,
  }
}

module.exports = { translateText, fillTranslations, shouldSkipTranslation }
