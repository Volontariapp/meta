import type { EngineInterface, Register } from 'claude-code'

import {
  basename,
  describeCheckout,
  describePr,
  parseManifest,
  parsePrs,
  parseStatus,
  parseWorktrees,
  prColor,
} from './repos'
import type { Checkout, Pr, RepoRow } from './repos'

const PANE = 'meta-repos'
const NAME_WIDTH = 24

type View = {
  phase: 'idle' | 'loading' | 'done' | 'error'
  rows: RepoRow[]
  message: string
}

let view: View = { phase: 'idle', rows: [], message: '' }

async function git(
  $: EngineInterface,
  cwd: string,
  args: readonly string[],
): Promise<string | undefined> {
  try {
    const ran = await $.process.run(['git', '-C', cwd, ...args], {
      timeoutMs: 20000,
    })

    return ran.exitCode === 0 ? ran.stdout : undefined
  } catch {
    return undefined
  }
}

async function pullRequests(
  $: EngineInterface,
  repo: string,
): Promise<Pr[] | undefined> {
  try {
    const ran = await $.process.run(
      [
        'gh',
        'pr',
        'list',
        '--repo',
        repo,
        '--state',
        'open',
        '--author',
        '@me',
        '--limit',
        '20',
        '--json',
        'number,title,headRefName,mergeable,statusCheckRollup',
      ],
      { timeoutMs: 25000 },
    )

    return ran.exitCode === 0 ? parsePrs(ran.stdout) : undefined
  } catch {
    return undefined
  }
}

async function inspect(
  $: EngineInterface,
  root: string,
  org: string,
  name: string,
): Promise<RepoRow | undefined> {
  const path = name === 'meta' ? root : `${root}/${name}`

  if (!(await $.fs.exists(`${path}/.git`))) {
    return undefined
  }

  const listing = await git($, path, ['worktree', 'list', '--porcelain'])
  const worktrees =
    listing === undefined
      ? [{ path, branch: undefined }]
      : parseWorktrees(listing)

  const checkouts: Checkout[] = await Promise.all(
    worktrees.map(async (worktree, index) => {
      const out = await git($, worktree.path, ['status', '--porcelain=v1', '-b'])
      const status = out === undefined
        ? { branch: 'illisible', ahead: 0, behind: 0, dirty: 0 }
        : parseStatus(out)

      return {
        ...status,
        label: basename(worktree.path),
        isMain: index === 0,
      }
    }),
  )

  return { name, checkouts, prs: await pullRequests($, `${org}/${name}`) }
}

async function load($: EngineInterface): Promise<void> {
  view = { phase: 'loading', rows: view.rows, message: '' }
  $.ui.invalidate('ui.render')

  try {
    const root = await $.session.root()
    const manifest = parseManifest(await $.fs.read(`${root}/repos.json`))

    if (manifest === undefined) {
      view = { phase: 'error', rows: [], message: 'repos.json illisible.' }
    } else {
      const found = await Promise.all(
        ['meta', ...manifest.names].map(name =>
          inspect($, root, manifest.org, name),
        ),
      )

      view = {
        phase: 'done',
        rows: found.filter((row): row is RepoRow => row !== undefined),
        message: '',
      }
    }
  } catch {
    view = {
      phase: 'error',
      rows: view.rows,
      message: 'Lecture des repos impossible.',
    }
  }

  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'repos',
      description: 'Panneau des repos de meta : branches, worktrees, PR et CI',
    })

    return next(e)
  })

  on('command.run', { command: 'repos' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Repos' })
    void load($)

    return { text: 'Panneau des repos ouvert.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const hasGh = view.rows.some(row => row.prs !== undefined)

    return (
      <Box flexDirection="column">
        <Box>
          <Text weight="bold">
            Repos ({view.rows.length}){' '}
          </Text>
          <Button key="refresh" label="Actualiser" onPress={() => load($)} />
        </Box>
        {view.phase === 'loading' && <Text dimColor>Chargement...</Text>}
        {view.phase === 'idle' && (
          <Text dimColor>Appuie sur Actualiser pour charger.</Text>
        )}
        {view.message !== '' && <Text color="red">{view.message}</Text>}
        {view.phase === 'done' && !hasGh && (
          <Text color="yellow">
            gh indisponible : PR et CI non affichées (gh auth status).
          </Text>
        )}
        {view.rows.flatMap(row => [
          ...row.checkouts.map((checkout, index) => (
            <Text dimColor={checkout.dirty === 0 && checkout.isMain}>
              {(index === 0 ? row.name : '').padEnd(NAME_WIDTH)}
              {describeCheckout(checkout)}
            </Text>
          )),
          ...(row.prs ?? []).map(pr => (
            <Text color={prColor(pr)}>
              {''.padEnd(NAME_WIDTH)}
              {describePr(pr)}
            </Text>
          )),
        ])}
      </Box>
    )
  })
}
