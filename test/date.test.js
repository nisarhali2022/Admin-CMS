import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getKarachiDateISO,
  getKarachiDateLabel,
  getKarachiDayStartISO,
  getSeoKarachiDateISO,
  getSeoKarachiDateLabel,
  getSeoKarachiDayStartISO,
} from '../lib/date.js'

test('Karachi date rolls over at 19:00 UTC', () => {
  assert.equal(
    getKarachiDateISO(new Date('2026-06-14T18:59:59Z')),
    '2026-06-14'
  )
  assert.equal(
    getKarachiDateISO(new Date('2026-06-14T19:00:00Z')),
    '2026-06-15'
  )
})

test('Karachi sitemap day start uses the correct offset', () => {
  assert.equal(
    getKarachiDayStartISO(new Date('2026-06-14T19:00:00Z')),
    '2026-06-15T00:00:00+05:00'
  )
})

test('SEO Karachi date moves 6 hours ahead of visible date', () => {
  const beforeSeoSwitch = new Date('2026-06-14T12:59:59Z') // 17:59:59 PKT
  assert.equal(getKarachiDateISO(beforeSeoSwitch), '2026-06-14')
  assert.equal(getSeoKarachiDateISO(beforeSeoSwitch), '2026-06-14')

  const afterSeoSwitch = new Date('2026-06-14T13:00:00Z') // 18:00:00 PKT
  assert.equal(getKarachiDateISO(afterSeoSwitch), '2026-06-14')
  assert.equal(getSeoKarachiDateISO(afterSeoSwitch), '2026-06-15')
  assert.equal(
    getSeoKarachiDayStartISO(afterSeoSwitch),
    '2026-06-15T00:00:00+05:00'
  )
})

test('visible and SEO labels match after Karachi midnight', () => {
  const afterMidnight = new Date('2026-06-14T19:00:00Z') // 00:00:00 PKT

  assert.equal(getKarachiDateISO(afterMidnight), '2026-06-15')
  assert.equal(getSeoKarachiDateISO(afterMidnight), '2026-06-15')
  assert.equal(
    getKarachiDateLabel(afterMidnight),
    getSeoKarachiDateLabel(afterMidnight)
  )
})
