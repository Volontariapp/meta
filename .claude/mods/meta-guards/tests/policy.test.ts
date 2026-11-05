import { expect, test } from 'claude-code/testing'

import {
  count,
  introduced,
  isExempt,
  isPublishingCommand,
  verdict,
} from '../hooks/policy'

const ROCKET = String.fromCodePoint(0x1f680)
const EM_DASH = String.fromCharCode(0x2014)

test('count finds emoji and em-dashes', async () => {
  expect(count(`a ${ROCKET} b ${EM_DASH} c`)).toEqual({ emoji: 1, emDash: 1 })
})

test('count ignores plain symbols and digits', async () => {
  expect(count('1 2 3 (c) a-b a: b')).toEqual({ emoji: 0, emDash: 0 })
})

test('only what a call adds is judged', async () => {
  const legacy = `title ${ROCKET}`

  expect(introduced(legacy, `${legacy} more`)).toEqual({ emoji: 0, emDash: 0 })
  expect(introduced(legacy, `${legacy} ${ROCKET}`)).toEqual({
    emoji: 1,
    emDash: 0,
  })
})

test('removing a character is never a violation', async () => {
  expect(introduced(`x ${EM_DASH} y`, 'x, y')).toEqual({ emoji: 0, emDash: 0 })
})

test('verdict is silent when nothing was added', async () => {
  expect(verdict('f.ts', { emoji: 0, emDash: 0 })).toBeUndefined()
})

test('verdict names the file and what was added', async () => {
  const message = verdict('docs/a.md', { emoji: 2, emDash: 1 })

  expect(message).toContain('docs/a.md')
  expect(message).toContain('2 emoji')
  expect(message).toContain('1 tiret(s) cadratin(s)')
})

test('lockfiles, binaries and dependencies are exempt', async () => {
  expect(isExempt('/r/yarn.lock')).toBe(true)
  expect(isExempt('/r/node_modules/x/index.js')).toBe(true)
  expect(isExempt('/r/logo.png')).toBe(true)
  expect(isExempt('/r/src/a.ts')).toBe(false)
})

test('only commit and PR publishing commands are checked', async () => {
  expect(isPublishingCommand('git commit -m "x"')).toBe(true)
  expect(isPublishingCommand('git -C /r commit -m "x"')).toBe(true)
  expect(isPublishingCommand('gh pr create --title x')).toBe(true)
  expect(isPublishingCommand('git status')).toBe(false)
  expect(isPublishingCommand('echo commit')).toBe(false)
})
