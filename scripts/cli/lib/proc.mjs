import { spawn, spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

/**
 * Resout les shims .cmd de Windows (yarn, npm, corepack...) sans passer par un shell.
 * @param {string} command
 */
function resolveCommand(command) {
  return isWindows && ['yarn', 'npm', 'npx', 'corepack'].includes(command) ? `${command}.cmd` : command;
}

/**
 * @typedef {{ cwd?: string, env?: NodeJS.ProcessEnv, input?: string }} RunOptions
 * @typedef {{ status: number, stdout: string, stderr: string }} RunResult
 */

/**
 * Execute une commande et capture sa sortie. Ne leve pas : renvoie le statut.
 * @param {string} command
 * @param {string[]} args
 * @param {RunOptions} [options]
 * @returns {RunResult}
 */
export function capture(command, args, options = {}) {
  const result = spawnSync(resolveCommand(command), args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    shell: false,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? (result.error ? String(result.error.message) : ''),
  };
}

/**
 * Execute une commande en heritant du terminal. Leve si le code retour est non nul.
 * @param {string} command
 * @param {string[]} args
 * @param {RunOptions} [options]
 * @returns {Promise<void>}
 */
export function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(resolveCommand(command), args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} a termine avec le code ${code ?? 'inconnu'}`));
    });
  });
}

/**
 * Vrai si la commande est trouvable dans le PATH.
 * @param {string} command
 */
export function hasCommand(command) {
  const probe = isWindows ? 'where' : 'which';
  return capture(probe, [command]).status === 0;
}

/**
 * Detecte l'environnement d'execution.
 * @returns {'macos' | 'linux' | 'wsl' | 'windows'}
 */
export function detectPlatform() {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  if (process.env.WSL_DISTRO_NAME !== undefined || process.env.WSL_INTEROP !== undefined) return 'wsl';
  return 'linux';
}

/**
 * Lance une commande dans son propre groupe de processus (POSIX) pour pouvoir l'arreter en entier.
 * @param {string} command
 * @param {string[]} args
 * @param {RunOptions} [options]
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnGroup(command, args, options = {}) {
  return spawn(resolveCommand(command), args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    shell: false,
    detached: !isWindows,
  });
}

/**
 * Arrete un processus et tous ses descendants (yarn -> nest -> node), ce que `child.kill()` ne fait pas.
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} [signal]
 */
export function killTree(child, signal = 'SIGTERM') {
  if (child.pid === undefined) return;
  if (isWindows) {
    capture('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}
