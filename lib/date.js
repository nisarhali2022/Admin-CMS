const KARACHI_TIME_ZONE = 'Asia/Karachi'
const SEO_DATE_OFFSET_HOURS = 6

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

export function getKarachiDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KARACHI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  )

  return `${values.year}-${values.month}-${values.day}`
}

export function getKarachiDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: KARACHI_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getKarachiDayStartISO(date = new Date()) {
  return `${getKarachiDateISO(date)}T00:00:00+05:00`
}

export function getSeoKarachiDateISO(date = new Date()) {
  return getKarachiDateISO(addHours(date, SEO_DATE_OFFSET_HOURS))
}

export function getSeoKarachiDateLabel(date = new Date()) {
  return getKarachiDateLabel(addHours(date, SEO_DATE_OFFSET_HOURS))
}

export function getSeoKarachiDayStartISO(date = new Date()) {
  return `${getSeoKarachiDateISO(date)}T00:00:00+05:00`
}
