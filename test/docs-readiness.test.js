import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('implementation milestone plan exists and starts at foundation', async () => {
  await access('docs/IMPLEMENTATION_MILESTONES.md')
  const milestones = await readFile('docs/IMPLEMENTATION_MILESTONES.md', 'utf8')

  assert.match(milestones, /Milestone 1: Foundation And Admin Session/)
  assert.match(milestones, /Milestone 13: Final Hardening/)
})

test('documentation index points implementers to milestones', async () => {
  const index = await readFile('docs/INDEX.md', 'utf8')

  assert.match(index, /IMPLEMENTATION_MILESTONES\.md/)
})
