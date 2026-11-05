import { expect, test } from 'claude-code/testing'

import { formatLock, markerPath, parseMarker } from '../hooks/lock'

test('parseMarker removes duplicates and blank lines, sorted', async () => {
  expect(parseMarker('proto-registry\nnpm-packages\n\nnpm-packages\n')).toEqual(
    ['npm-packages', 'proto-registry'],
  )
})

test('formatLock is silent without a locked repository', async () => {
  expect(formatLock([])).toBeUndefined()
})

test('formatLock names every upstream repository', async () => {
  expect(formatLock(['npm-packages', 'proto-registry'])).toContain(
    'npm-packages, proto-registry',
  )
})

test('markerPath matches the shell guard layout', async () => {
  expect(markerPath('/repo/.git/', 'abc')).toBe(
    '/repo/.git/volontariapp-stop-guard/abc',
  )
})
