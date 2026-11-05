// Pure parsing and formatting for the /repos pane. Everything here takes text
// and returns data: the git and gh calls live in register.tsx.

export type Checks = 'green' | 'red' | 'pending' | 'none'

export type Pr = {
  number: number
  title: string
  head: string
  mergeable: string
  checks: Checks
}

export type GitStatus = {
  branch: string
  ahead: number
  behind: number
  dirty: number
}

export type Worktree = { path: string; branch: string | undefined }

export type Checkout = GitStatus & { label: string; isMain: boolean }

export type RepoRow = {
  name: string
  checkouts: Checkout[]
  // undefined when gh could not answer (not installed, not signed in, no access).
  prs: Pr[] | undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

export const basename = (path: string): string =>
  path.replace(/\/+$/, '').split('/').pop() ?? path

export const parseManifest = (
  json: string,
): { org: string; names: string[] } | undefined => {
  let data: unknown

  try {
    data = JSON.parse(json)
  } catch {
    return undefined
  }

  if (!isRecord(data) || !Array.isArray(data.repos)) {
    return undefined
  }

  const names: string[] = []

  for (const repo of data.repos as unknown[]) {
    if (isRecord(repo) && typeof repo.name === 'string') {
      names.push(repo.name)
    }
  }

  return { org: asString(data.org), names }
}

// Output of `git status --porcelain=v1 -b`: first line `## branch...upstream [ahead 1, behind 2]`.
export const parseStatus = (out: string): GitStatus => {
  const lines = out.split('\n').filter(line => line !== '')
  const head = /^## (?:No commits yet on |Initial commit on )?(.+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/.exec(
    lines[0] ?? '',
  )
  const info = head?.[3] ?? ''
  const number = (pattern: RegExp): number => Number(pattern.exec(info)?.[1] ?? 0)

  return {
    branch: head?.[1] ?? 'inconnue',
    ahead: number(/ahead (\d+)/),
    behind: number(/behind (\d+)/),
    dirty: Math.max(0, lines.length - 1),
  }
}

// Output of `git worktree list --porcelain`: blocks separated by a blank line, main checkout first.
export const parseWorktrees = (out: string): Worktree[] =>
  out.split(/\n\n+/).flatMap(block => {
    const lines = block.split('\n')
    const path = lines.find(line => line.startsWith('worktree '))

    if (path === undefined) {
      return []
    }

    const ref = lines.find(line => line.startsWith('branch '))

    return [
      {
        path: path.slice('worktree '.length),
        branch: ref?.slice('branch '.length).replace(/^refs\/heads\//, ''),
      },
    ]
  })

const BAD = new Set([
  'FAILURE',
  'TIMED_OUT',
  'CANCELLED',
  'ACTION_REQUIRED',
  'STARTUP_FAILURE',
  'ERROR',
])
const GOOD = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED'])

// `statusCheckRollup` of `gh pr list --json`: CheckRun items carry status and
// conclusion, StatusContext items carry state.
export const summarizeChecks = (rollup: unknown): Checks => {
  if (!Array.isArray(rollup) || rollup.length === 0) {
    return 'none'
  }

  let isPending = false

  for (const item of rollup as unknown[]) {
    if (!isRecord(item)) {
      continue
    }

    const state =
      asString(item.conclusion) || asString(item.state) || asString(item.status)

    if (BAD.has(state)) {
      return 'red'
    }

    if (!GOOD.has(state)) {
      isPending = true
    }
  }

  return isPending ? 'pending' : 'green'
}

export const parsePrs = (json: string): Pr[] => {
  let data: unknown

  try {
    data = JSON.parse(json)
  } catch {
    return []
  }

  if (!Array.isArray(data)) {
    return []
  }

  return (data as unknown[]).flatMap(item =>
    isRecord(item) && typeof item.number === 'number'
      ? [
          {
            number: item.number,
            title: asString(item.title),
            head: asString(item.headRefName),
            mergeable: asString(item.mergeable),
            checks: summarizeChecks(item.statusCheckRollup),
          },
        ]
      : [],
  )
}

const CHECK_LABEL: Record<Checks, string> = {
  green: 'verte',
  red: 'rouge',
  pending: 'en cours',
  none: 'absente',
}

const mergeLabel = (mergeable: string): string =>
  mergeable === 'MERGEABLE'
    ? 'sans conflit'
    : mergeable === 'CONFLICTING'
      ? 'CONFLIT'
      : 'mergeabilité inconnue'

// Rule 7 of AGENTS.md: a PR is ready when it has no conflict and the CI is green.
export const isReady = (pr: Pr): boolean =>
  pr.checks === 'green' && pr.mergeable === 'MERGEABLE'

export const describePr = (pr: Pr): string =>
  `#${pr.number} ${pr.title.slice(0, 60)} | CI ${CHECK_LABEL[pr.checks]} | ${mergeLabel(pr.mergeable)}${isReady(pr) ? ' | PRETE' : ''}`

export const describeCheckout = (checkout: Checkout): string => {
  const parts = [checkout.branch]

  if (checkout.dirty > 0) {
    parts.push(`${checkout.dirty} modif.`)
  }

  if (checkout.ahead > 0) {
    parts.push(`${checkout.ahead} en avance`)
  }

  if (checkout.behind > 0) {
    parts.push(`${checkout.behind} en retard`)
  }

  const text = parts.join(', ')

  return checkout.isMain ? text : `${text} [worktree ${checkout.label}]`
}

export const prColor = (pr: Pr): string =>
  isReady(pr)
    ? 'green'
    : pr.checks === 'red' || pr.mergeable === 'CONFLICTING'
      ? 'red'
      : 'yellow'
