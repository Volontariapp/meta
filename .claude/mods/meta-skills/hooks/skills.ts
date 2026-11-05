// Pure helpers for the skills mod: SKILL.md frontmatter, the JSON of
// `evolve.py status --json`, search and formatting.

export type SkillInfo = { name: string; description: string }

export type SkillState = {
  name: string
  isStale: boolean
  problems: number
}

export type Summary = { stale: number; invalid: number }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const unquote = (value: string): string => {
  const quoted = /^"(.*)"$|^'(.*)'$/.exec(value)

  return quoted ? (quoted[1] ?? quoted[2] ?? '') : value
}

// Value of a top-level frontmatter key: inline, or a folded/literal block.
const readKey = (lines: readonly string[], key: string): string | undefined => {
  const index = lines.findIndex(line => line.startsWith(`${key}:`))

  if (index < 0) {
    return undefined
  }

  const inline = (lines[index] ?? '').slice(key.length + 1).trim()

  if (inline !== '' && !/^[>|]/.test(inline)) {
    return unquote(inline)
  }

  const block: string[] = []

  for (const line of lines.slice(index + 1)) {
    if (!/^\s+\S/.test(line)) {
      break
    }

    block.push(line.trim())
  }

  return block.join(' ')
}

export const parseFrontmatter = (text: string): SkillInfo | undefined => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)

  if (!match) {
    return undefined
  }

  const lines = (match[1] ?? '').split(/\r?\n/)
  const name = readKey(lines, 'name')

  return name === undefined
    ? undefined
    : { name, description: readKey(lines, 'description') ?? '' }
}

export const parseStates = (json: string): SkillState[] => {
  let data: unknown

  try {
    data = JSON.parse(json)
  } catch {
    return []
  }

  if (!isRecord(data) || !Array.isArray(data.skills)) {
    return []
  }

  return (data.skills as unknown[]).flatMap(item =>
    isRecord(item) && typeof item.name === 'string'
      ? [
          {
            name: item.name,
            isStale: item.stale === true,
            problems: Array.isArray(item.problems) ? item.problems.length : 0,
          },
        ]
      : [],
  )
}

export const summarize = (states: readonly SkillState[]): Summary => ({
  stale: states.filter(state => state.isStale).length,
  invalid: states.filter(state => state.problems > 0).length,
})

export const formatBand = (summary: Summary): string | undefined => {
  const parts: string[] = []

  if (summary.stale > 0) {
    parts.push(`${summary.stale} à relire`)
  }

  if (summary.invalid > 0) {
    parts.push(`${summary.invalid} non conforme(s)`)
  }

  return parts.length === 0
    ? undefined
    : `Skills : ${parts.join(', ')} (/skill-search pour le détail)`
}

const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Every word of the query must appear in the name or the description.
export const matches = (skill: SkillInfo, query: string): boolean => {
  const haystack = fold(`${skill.name} ${skill.description}`)

  return fold(query)
    .split(/\s+/)
    .filter(word => word !== '')
    .every(word => haystack.includes(word))
}

const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text

export const formatList = (
  skills: readonly SkillInfo[],
  states: readonly SkillState[],
  query: string,
): string => {
  const byName = new Map(states.map(state => [state.name, state]))
  const wanted = query.trim()
  const found = skills
    .filter(skill => wanted === '' || matches(skill, wanted))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (found.length === 0) {
    return `Aucune skill ne correspond à "${wanted}" (${skills.length} skills au total).`
  }

  const width = wanted === '' ? 90 : 220
  const lines = found.map(skill => {
    const state = byName.get(skill.name)
    const flags = [
      state?.isStale ? 'à relire' : '',
      state !== undefined && state.problems > 0 ? 'non conforme' : '',
    ].filter(flag => flag !== '')
    const mark = flags.length > 0 ? ` [${flags.join(', ')}]` : ''

    return `${skill.name}${mark} : ${clip(skill.description, width)}`
  })
  const head =
    wanted === ''
      ? `${found.length} skills (/skill-search <mots> pour filtrer) :`
      : `${found.length} skill(s) pour "${wanted}" sur ${skills.length} :`

  return [head, ...lines].join('\n')
}
