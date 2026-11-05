import { expect, test } from 'claude-code/testing'

import {
  formatBand,
  formatList,
  matches,
  parseFrontmatter,
  parseStates,
  summarize,
} from '../hooks/skills'

test('parseFrontmatter reads a quoted inline description', async () => {
  const text = '---\nname: volontariapp-logger\ndescription: "Modifier @volontariapp/logger : masquage"\ntype: Standard\n---\n\n# Body'

  expect(parseFrontmatter(text)).toEqual({
    name: 'volontariapp-logger',
    description: 'Modifier @volontariapp/logger : masquage',
  })
})

test('parseFrontmatter reads a plain description', async () => {
  const text = '---\nname: tdd\ndescription: Test-driven development. Use when x.\n---\n# T'

  expect(parseFrontmatter(text)?.description).toBe(
    'Test-driven development. Use when x.',
  )
})

test('parseFrontmatter reads a folded block description', async () => {
  const text = '---\nname: a\ndescription: >-\n  first line\n  second line\nstatus: x\n---\n'

  expect(parseFrontmatter(text)?.description).toBe('first line second line')
})

test('parseFrontmatter refuses a file without frontmatter or name', async () => {
  expect(parseFrontmatter('# Just a title')).toBeUndefined()
  expect(parseFrontmatter('---\ndescription: x\n---\n')).toBeUndefined()
})

test('parseStates reads the evolve.py status JSON', async () => {
  const json = JSON.stringify({
    skills: [
      { name: 'a', stale: true, problems: [] },
      { name: 'b', stale: false, problems: ['source introuvable'] },
      { name: 'c', stale: false, problems: [] },
    ],
    uncovered: [],
  })
  const states = parseStates(json)

  expect(states).toHaveLength(3)
  expect(summarize(states)).toEqual({ stale: 1, invalid: 1 })
})

test('parseStates tolerates garbage', async () => {
  expect(parseStates('oops')).toEqual([])
  expect(parseStates('{"skills": 1}')).toEqual([])
})

test('formatBand is silent when everything is fresh', async () => {
  expect(formatBand({ stale: 0, invalid: 0 })).toBeUndefined()
  expect(formatBand({ stale: 2, invalid: 1 })).toContain('2 à relire')
  expect(formatBand({ stale: 2, invalid: 1 })).toContain('1 non conforme')
})

test('matches ignores case and accents and needs every word', async () => {
  const skill = { name: 'volontariapp-db-migration', description: 'Migration TypeORM sans coupure' }

  expect(matches(skill, 'MIGRATION coupure')).toBe(true)
  expect(matches(skill, 'migratión')).toBe(true)
  expect(matches(skill, 'migration kubernetes')).toBe(false)
})

test('formatList filters, flags drift and reports an empty search', async () => {
  const skills = [
    { name: 'b-skill', description: 'Deploy things' },
    { name: 'a-skill', description: 'Migration help' },
  ]
  const states = [{ name: 'a-skill', isStale: true, problems: 0 }]

  const all = formatList(skills, states, '')
  expect(all.indexOf('a-skill')).toBeLessThan(all.indexOf('b-skill'))
  expect(all).toContain('a-skill [à relire]')

  expect(formatList(skills, states, 'deploy')).toContain('b-skill')
  expect(formatList(skills, states, 'deploy')).not.toContain('a-skill')
  expect(formatList(skills, states, 'zzz')).toContain('Aucune skill')
})
