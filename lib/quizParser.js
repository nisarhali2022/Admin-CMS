import { getKarachiDateISO, getKarachiDateLabel } from './date.js'

const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeHtmlEntities(value) {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalizedEntity = entity.toLowerCase()

    if (normalizedEntity.startsWith('#x')) {
      return String.fromCodePoint(parseInt(normalizedEntity.slice(2), 16))
    }

    if (normalizedEntity.startsWith('#')) {
      return String.fromCodePoint(parseInt(normalizedEntity.slice(1), 10))
    }

    return HTML_ENTITIES[normalizedEntity] || match
  })
}

function stripHtml(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
}

// Get today's date string in Karachi timezone: "2026-06-11"
export function getTodayKarachi() {
  return getKarachiDateISO()
}

// Get formatted display date in Karachi: "11 June 2026"
export function getTodayLabelKarachi() {
  return getKarachiDateLabel()
}

function cleanCellText(html) {
  return decodeHtmlEntities(stripHtml(html)).replace(/\s+/g, ' ').trim()
}

function parseQuizTable(tableHtml) {
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
  let question = ''
  const options = []
  let answer = ''

  for (const row of rows) {
    const cellMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
    if (!cellMatch) continue

    const cellText = cleanCellText(cellMatch[1])

    const questionMatch = cellText.match(
      /^Question\s*\d+\s*[:\-\u2013\u2014]\s*(.+)$/i
    )
    if (questionMatch) {
      question = questionMatch[1].trim()
      continue
    }

    const optionMatch = cellText.match(
      /^(?:[-\u2013\u2014]|\u00e2\u20ac[\u201c\u201d])\s*(.+)$/
    )
    if (optionMatch) {
      options.push(optionMatch[1].trim())
      continue
    }

    const answerMatch = cellText.match(
      /^Answer\s*(?:(?:\uD83D\uDC49)|\u2192|:|\u00f0\u0178\u2018\u2030|\u00e2\u2020\u2019)*\s*(.+)$/i
    )
    if (answerMatch) {
      answer = answerMatch[1].trim()
    }
  }

  if (!question || !answer) return null

  return {
    question,
    options: options.filter(Boolean).slice(0, 4),
    answer,
  }
}

// Parse the quiz-table format saved to WordPress by /api/quiz.
export function parseQuizTables(html) {
  if (!html) return []

  const tableRegex = /<table[\s\S]*?<\/table>/gi
  const tables = html.match(tableRegex) || []

  return tables.map(parseQuizTable).filter(Boolean)
}

// Parse FAQs from HTML
export function parseFaqs(html) {
  if (!html) return []
  const text = stripHtml(html)
  const faqs = []
  const qMatches = [...text.matchAll(/Q:\s*(.+?)\s*(?=A:|$)/gs)]
  const aMatches = [...text.matchAll(/A:\s*(.+?)\s*(?=Q:|$)/gs)]
  for (let i = 0; i < Math.min(qMatches.length, aMatches.length); i++) {
    faqs.push({ q: qMatches[i][1].trim(), a: aMatches[i][1].trim() })
  }
  return faqs
}
