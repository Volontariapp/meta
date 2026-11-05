import type { EngineInterface, Register } from 'claude-code'

import { introduced, isExempt, isPublishingCommand, verdict } from './policy'

// '' when the file is not there yet, undefined when it exists but cannot be
// read: the guard then lets the write through rather than guess.
async function existingText(
  $: EngineInterface,
  path: string,
): Promise<string | undefined> {
  try {
    if (!(await $.fs.exists(path))) {
      return ''
    }

    return await $.fs.read(path)
  } catch {
    return undefined
  }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, (_$, e, next) => {
    if (isExempt(e.file_path)) {
      return next(e)
    }

    const message = verdict(e.file_path, introduced(e.old_string, e.new_string))

    return message === undefined ? next(e) : { deny: message }
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (isExempt(e.file_path)) {
      return next(e)
    }

    const before = await existingText($, e.file_path)

    if (before === undefined) {
      return next(e)
    }

    const message = verdict(e.file_path, introduced(before, e.content))

    return message === undefined ? next(e) : { deny: message }
  })

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => {
    if (!isPublishingCommand(e.command)) {
      return next(e)
    }

    const message = verdict('Ce message de commit ou de PR', introduced('', e.command))

    return message === undefined ? next(e) : { deny: message }
  })
}
