// Pure helpers for the STOP-rule indicator. The marker file is written by
// .claude/hooks/post-edit.sh: one upstream repository name per line.

export const STATE_DIR = 'volontariapp-stop-guard'

export const parseMarker = (text: string): string[] => {
  const names = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')

  return [...new Set(names)].sort()
}

export const formatLock = (repos: readonly string[]): string | undefined =>
  repos.length === 0
    ? undefined
    : `STOP actif : ${repos.join(', ')} modifié. Éditer un consommateur de @volontariapp/* est refusé jusqu'à la publication CI (levée par le Lead Dev).`

export const markerPath = (
  gitCommonDir: string,
  sessionId: string,
): string => `${gitCommonDir.replace(/\/+$/, '')}/${STATE_DIR}/${sessionId}`
