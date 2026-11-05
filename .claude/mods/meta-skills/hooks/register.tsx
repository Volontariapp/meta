import type { EngineInterface, Register } from 'claude-code'

import { formatBand, formatList, parseFrontmatter, parseStates, summarize } from './skills'
import type { SkillInfo, SkillState } from './skills'

const SKILLS_DIR = '.agents/skills'
const EVOLVE = `${SKILLS_DIR}/volontariapp-skill-evolution/scripts/evolve.py`
// evolve.py status walks every cloned repository: do not run it after every turn.
const MIN_INTERVAL_MS = 90_000

let states: SkillState[] = []
let checkedAt = 0
let isHidden = false

async function refreshStates(
  $: EngineInterface,
  isForced: boolean,
): Promise<void> {
  try {
    const now = await $.clock.now()

    if (!isForced && now - checkedAt < MIN_INTERVAL_MS) {
      return
    }

    const root = await $.session.root()

    if (!(await $.fs.exists(`${root}/${EVOLVE}`))) {
      return
    }

    checkedAt = now

    const ran = await $.process.run(
      ['python3', `${root}/${EVOLVE}`, 'status', '--json'],
      { cwd: root, timeoutMs: 40000 },
    )

    if (ran.exitCode === 0) {
      states = parseStates(ran.stdout)
      $.ui.invalidate('ui.render')
    }
  } catch {
    // The band is a convenience: a failure leaves the last known state.
  }
}

async function loadSkills($: EngineInterface): Promise<SkillInfo[]> {
  const root = await $.session.root()
  const entries = await $.fs.list(`${root}/${SKILLS_DIR}`)
  const found = await Promise.all(
    entries.map(async (entry): Promise<SkillInfo | undefined> => {
      try {
        return parseFrontmatter(
          await $.fs.read(`${root}/${SKILLS_DIR}/${entry.name}/SKILL.md`),
        )
      } catch {
        // index.md, log.md and anything that is not a skill folder.
        return undefined
      }
    }),
  )

  return found.filter((skill): skill is SkillInfo => skill !== undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skill-search',
      description: 'Liste ou cherche les skills du projet : /skill-search <mots>',
    })
    const started = await next(e)
    void refreshStates($, false)

    return started
  })

  on('turn.complete', async ($, e, next) => {
    void refreshStates($, false)

    return next(e)
  })

  on('command.run', { command: 'skill-search' }, async ($, e) => {
    await refreshStates($, true)

    try {
      return { text: formatList(await loadSkills($), states, e.args) }
    } catch {
      return { text: `Lecture de ${SKILLS_DIR} impossible.` }
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    const band = formatBand(summarize(states))

    if (e.props.hasSurvey || isHidden || band === undefined) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color="yellow">{band} </Text>
        <Button
          key="hide"
          label="Masquer"
          onPress={() => {
            isHidden = true
            $.ui.invalidate('ui.render')
          }}
        />
      </Box>
    )
  })
}
