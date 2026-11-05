import { expect, test } from 'claude-code/testing'

const ROCKET = String.fromCodePoint(0x1f680)
const EM_DASH = String.fromCharCode(0x2014)

// In each test, `on('tool.call', ...)` stands for the tool itself: nothing sits
// beneath the plugin under test.
test('an Edit that adds an emoji is refused', async ($, on) => {
  on('tool.call', () => ({ result: {} }))

  const out = await $.tool.call({
    tool: 'Edit',
    file_path: '/r/docs/a.md',
    old_string: 'title',
    new_string: `title ${ROCKET}`,
  })

  expect('deny' in out ? out.deny : '').toContain('Politique du projet')
})

test('an Edit that keeps a legacy emoji goes through', async ($, on) => {
  on('tool.call', () => ({ result: {} }))

  const out = await $.tool.call({
    tool: 'Edit',
    file_path: '/r/docs/a.md',
    old_string: `title ${ROCKET}`,
    new_string: `new title ${ROCKET}`,
  })

  expect('deny' in out).toBe(false)
})

test('a Write that adds an em-dash to a new file is refused', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  on('fs.exists', () => ({ value: false }))

  const out = await $.tool.call({
    tool: 'Write',
    file_path: '/r/docs/new.md',
    content: `one ${EM_DASH} two`,
  })

  expect('deny' in out ? out.deny : '').toContain('tiret(s) cadratin(s)')
})

test('a Write over a file that already has the character goes through', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', () => ({ value: `one ${EM_DASH} two` }))

  const out = await $.tool.call({
    tool: 'Write',
    file_path: '/r/docs/old.md',
    content: `one ${EM_DASH} two three`,
  })

  expect('deny' in out).toBe(false)
})

test('a commit message with an emoji is refused, a clean one is not', async ($, on) => {
  on('tool.call', () => ({ result: {} }))

  const bad = await $.tool.call({
    tool: 'Bash',
    command: `git commit -m "feat: ship ${ROCKET}"`,
  })
  const good = await $.tool.call({
    tool: 'Bash',
    command: 'git commit -m "feat: ship"',
  })
  const other = await $.tool.call({
    tool: 'Bash',
    command: `echo ${ROCKET}`,
  })

  expect('deny' in bad).toBe(true)
  expect('deny' in good).toBe(false)
  expect('deny' in other).toBe(false)
})
