// Style policy of CLAUDE.md: no emoji and no em-dash. Only what a call ADDS is
// judged (after minus before), so editing a legacy line that already holds one
// is not punished. This file builds both characters from their code points on
// purpose: the policy applies to it too.

const VARIATION_SELECTOR = String.fromCharCode(0xfe0f)
const EMOJI = new RegExp(
  String.raw`\p{Emoji_Presentation}|\p{Extended_Pictographic}` + VARIATION_SELECTOR,
  'gu',
)
const EM_DASH = new RegExp(String.fromCharCode(0x2014), 'g')

const EXEMPT_PATH =
  /(^|\/)(node_modules|\.git)\/|\.(lock|svg|png|jpe?g|gif|webp|pdf|woff2?)$/i

// `git [-C dir] [-c k=v] commit` : an option may take one argument.
const PUBLISHING_COMMAND =
  /\bgit(?:\s+-\S+(?:\s+[^-\s]\S*)?)*\s+commit\b|\bgh\s+pr\s+(?:create|edit|comment)\b/

export type Counts = { emoji: number; emDash: number }

export const count = (text: string): Counts => ({
  emoji: (text.match(EMOJI) ?? []).length,
  emDash: (text.match(EM_DASH) ?? []).length,
})

export const introduced = (before: string, after: string): Counts => {
  const was = count(before)
  const is = count(after)

  return {
    emoji: Math.max(0, is.emoji - was.emoji),
    emDash: Math.max(0, is.emDash - was.emDash),
  }
}

export const isExempt = (path: string): boolean => EXEMPT_PATH.test(path)

export const isPublishingCommand = (command: string): boolean =>
  PUBLISHING_COMMAND.test(command)

export const verdict = (where: string, added: Counts): string | undefined => {
  const parts: string[] = []

  if (added.emoji > 0) {
    parts.push(`${added.emoji} emoji`)
  }

  if (added.emDash > 0) {
    parts.push(`${added.emDash} tiret(s) cadratin(s)`)
  }

  if (parts.length === 0) {
    return undefined
  }

  return `Politique du projet (CLAUDE.md) : ni emoji ni tiret cadratin. ${where} en ajouterait ${parts.join(' et ')}. Reformule avec une virgule, deux-points ou des parenthèses, puis recommence.`
}
