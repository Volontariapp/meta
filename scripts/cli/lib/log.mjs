const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

/**
 * @param {number} code
 * @returns {(text: string) => string}
 */
const paint = (code) => (text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

export const bold = paint(1);
export const dim = paint(2);
export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const blue = paint(34);

/** @param {string} message */
export const info = (message) => console.log(`${blue('[info]')} ${message}`);
/** @param {string} message */
export const ok = (message) => console.log(`${green('[ ok ]')} ${message}`);
/** @param {string} message */
export const warn = (message) => console.warn(`${yellow('[warn]')} ${message}`);
/** @param {string} message */
export const fail = (message) => console.error(`${red('[fail]')} ${message}`);

/**
 * @param {number} index
 * @param {number} total
 * @param {string} title
 */
export const step = (index, total, title) => console.log(`\n${bold(`[${index}/${total}] ${title}`)}`);
