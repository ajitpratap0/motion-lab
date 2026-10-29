import {spawn} from 'node:child_process';

/** Run a command without a shell; raw mode preserves binary stdout. */
export function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', error => {
      if (error.code === 'ENOENT') {
        error.exitCode = 2;
        error.message = `${command} not found on PATH`;
      }
      reject(error);
    });
    child.on('close', code => resolve({
      code: code ?? 1,
      stdout: options.raw ? Buffer.concat(stdout) : Buffer.concat(stdout).toString(),
      stderr: Buffer.concat(stderr).toString(),
    }));
    child.stdin.on('error', () => {});
    child.stdin.end(options.input);
  });
}

/** Run ffmpeg with quiet diagnostic output and array arguments. */
export function runFFmpeg(args, options = {}) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], options);
}

/** Run ffmpeg and throw with its diagnostic text on failure. */
export async function checked(args, options = {}) {
  const result = await runFFmpeg(args, options);
  if (result.code !== 0) throw new Error(`ffmpeg failed: ${result.stderr.trim()}`);
  return result;
}

/** Read stream and container metadata, retaining the subprocess result. */
export async function probe(file) {
  const result = await run('ffprobe', [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json', file,
  ]);
  return {...result, data: result.code === 0 ? JSON.parse(result.stdout) : null};
}
