import type { EngineInterface, Register } from 'claude-code'

import { formatLock, markerPath, parseMarker } from './lock'

// Edits are what write the marker (post-edit.sh, PostToolUse), so refresh after
// them. turn.complete and prompt.submit catch a marker written a moment later
// and the release done by the Lead Dev (`stop-rule-guard.sh release`).
let marker: string | undefined

async function locate($: EngineInterface): Promise<string | undefined> {
  if (marker !== undefined) {
    return marker
  }

  const root = await $.session.root()
  // Same directory as stop-rule-guard.sh: shared by every checkout and worktree.
  const git = await $.process.run([
    'git',
    '-C',
    root,
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  ])
  const common = git.stdout.trim()

  if (git.exitCode !== 0 || common === '') {
    return undefined
  }

  marker = markerPath(common, await $.session.id())

  return marker
}

async function refresh($: EngineInterface): Promise<void> {
  try {
    const path = await locate($)

    if (path === undefined || !(await $.fs.exists(path))) {
      $.ui.status(undefined)

      return
    }

    $.ui.status(formatLock(parseMarker(await $.fs.read(path))))
  } catch {
    $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)

    return started
  })

  on('tool.call', { tool: ['Write', 'Edit', 'NotebookEdit'] }, async ($, e, next) => {
    const ran = await next(e)
    await refresh($)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
