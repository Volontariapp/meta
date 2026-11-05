import { expect, test } from 'claude-code/testing'

import {
  basename,
  describeCheckout,
  describePr,
  isReady,
  parseManifest,
  parsePrs,
  parseStatus,
  parseWorktrees,
  summarizeChecks,
} from '../hooks/repos'

test('parseManifest lists repo names and the org', async () => {
  const manifest = parseManifest(
    JSON.stringify({ org: 'Volontariapp', repos: [{ name: 'ms-user' }, { name: 'docs' }, {}] }),
  )

  expect(manifest).toEqual({ org: 'Volontariapp', names: ['ms-user', 'docs'] })
})

test('parseManifest refuses invalid input', async () => {
  expect(parseManifest('not json')).toBeUndefined()
  expect(parseManifest('{"repos": 3}')).toBeUndefined()
})

test('parseStatus reads branch, divergence and dirty files', async () => {
  const out = '## feat/x...origin/feat/x [ahead 2, behind 1]\n M a.ts\n?? b.ts\n'

  expect(parseStatus(out)).toEqual({
    branch: 'feat/x',
    ahead: 2,
    behind: 1,
    dirty: 2,
  })
})

test('parseStatus handles a branch without upstream and a clean tree', async () => {
  expect(parseStatus('## main\n')).toEqual({
    branch: 'main',
    ahead: 0,
    behind: 0,
    dirty: 0,
  })
})

test('parseStatus handles a detached head', async () => {
  expect(parseStatus('## HEAD (no branch)\n').branch).toBe('HEAD (no branch)')
})

test('parseWorktrees returns the main checkout first, then the others', async () => {
  const out = [
    'worktree /r',
    'HEAD abc',
    'branch refs/heads/main',
    '',
    'worktree /r/.worktrees/w1',
    'HEAD def',
    'branch refs/heads/feat/w1',
    '',
    'worktree /r/.worktrees/w2',
    'HEAD 123',
    'detached',
    '',
  ].join('\n')

  expect(parseWorktrees(out)).toEqual([
    { path: '/r', branch: 'main' },
    { path: '/r/.worktrees/w1', branch: 'feat/w1' },
    { path: '/r/.worktrees/w2', branch: undefined },
  ])
})

test('summarizeChecks: red wins, then pending, then green', async () => {
  const ok = { status: 'COMPLETED', conclusion: 'SUCCESS' }
  const bad = { status: 'COMPLETED', conclusion: 'FAILURE' }
  const running = { status: 'IN_PROGRESS', conclusion: '' }
  const context = { state: 'SUCCESS' }

  expect(summarizeChecks([ok, context])).toBe('green')
  expect(summarizeChecks([ok, running])).toBe('pending')
  expect(summarizeChecks([ok, running, bad])).toBe('red')
  expect(summarizeChecks([])).toBe('none')
  expect(summarizeChecks(undefined)).toBe('none')
})

test('a skipped or neutral check does not block readiness', async () => {
  expect(
    summarizeChecks([{ status: 'COMPLETED', conclusion: 'SKIPPED' }]),
  ).toBe('green')
})

test('parsePrs and the readiness rule of AGENTS.md section 7', async () => {
  const json = JSON.stringify([
    {
      number: 7,
      title: 'feat: x',
      headRefName: 'feat/x',
      mergeable: 'MERGEABLE',
      statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
    },
    {
      number: 8,
      title: 'fix: y',
      headRefName: 'fix/y',
      mergeable: 'CONFLICTING',
      statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
    },
  ])
  const [ready, conflicting] = parsePrs(json)

  expect(ready && isReady(ready)).toBe(true)
  expect(conflicting && isReady(conflicting)).toBe(false)
  expect(ready && describePr(ready)).toContain('PRETE')
  expect(conflicting && describePr(conflicting)).toContain('CONFLIT')
})

test('describeCheckout marks worktrees and divergence', async () => {
  expect(
    describeCheckout({
      branch: 'feat/x',
      ahead: 1,
      behind: 0,
      dirty: 3,
      label: 'gw-g5',
      isMain: false,
    }),
  ).toBe('feat/x, 3 modif., 1 en avance [worktree gw-g5]')
})

test('basename ignores a trailing slash', async () => {
  expect(basename('/r/.worktrees/w1/')).toBe('w1')
})
