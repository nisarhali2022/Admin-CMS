const KARACHI_TIME_ZONE = 'Asia/Karachi'
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: KARACHI_TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const ISO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KARACHI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function formatIsoDate(date) {
  const parts = Object.fromEntries(
    ISO_DATE_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getQuizDates(now = new Date()) {
  const visibleDate = now
  const seoDate = addHours(now, 6)

  return {
    timeZone: KARACHI_TIME_ZONE,
    visibleDateLabel: DATE_FORMATTER.format(visibleDate),
    visibleDate: formatIsoDate(visibleDate),
    seoDateLabel: DATE_FORMATTER.format(seoDate),
    seoDate: formatIsoDate(seoDate),
  }
}
