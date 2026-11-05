import { expect, test } from 'claude-code/testing'

test('the status line shows the lock after an edit once the marker exists', async ($, on) => {
  const seen: (string | undefined)[] = []

  on('session.root', () => ({ value: '/r' }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: '/r/.git\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('fs.exists', (_, e) => ({
    value: e.path === '/r/.git/volontariapp-stop-guard/sess-1',
  }))
  on('fs.read', () => ({ value: 'npm-packages\nproto-registry\n' }))
  on('ui.status', (_, e) => {
    seen.push(e.text)

    return { value: undefined }
  })
  on('tool.call', () => ({ result: {} }))

  await $.tool.call({
    tool: 'Edit',
    file_path: '/r/npm-packages/a.ts',
    old_string: 'a',
    new_string: 'b',
  })

  expect(seen.at(-1)).toContain('npm-packages, proto-registry')
})

test('the status line stays clear without a marker', async ($, on) => {
  const seen: (string | undefined)[] = []

  on('session.root', () => ({ value: '/r' }))
  on('session.id', () => ({ value: 'sess-2' }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: '/r/.git\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('fs.exists', () => ({ value: false }))
  on('ui.status', (_, e) => {
    seen.push(e.text)

    return { value: undefined }
  })
  on('tool.call', () => ({ result: {} }))

  await $.tool.call({
    tool: 'Write',
    file_path: '/r/docs/a.md',
    content: 'x',
  })

  expect(seen.at(-1)).toBeUndefined()
})
