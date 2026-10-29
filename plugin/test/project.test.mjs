import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadProjectConfig, resolveProjectOptions } from '../scripts/lib/project.mjs';
import { run, checked, probe } from '../scripts/lib/ffmpeg.mjs';

test('project defaults use flags over spec over config over built-ins', () => {
  const args = { _: [] };
  assert.deepEqual(resolveProjectOptions(args), {
    file: 'anim.html', secs: 6, fps: 24, width: 1080, height: 1080,
  });
  const config = { file: 'scene.html', secs: 8, fps: 60, width: 1920, height: 1080 };
  assert.deepEqual(resolveProjectOptions(args, config), config);
  const spec = { secs: 4, fps: 30, width: 800, height: 600 };
  assert.deepEqual(resolveProjectOptions(args, config, spec), { ...config, ...spec });
  const flags = { _: ['override.html'], secs: '2', fps: '12', width: '400', height: '300' };
  assert.deepEqual(resolveProjectOptions(flags, config, spec), {
    file: 'override.html', secs: 2, fps: 12, width: 400, height: 300,
  });
});

test('project lookup has no depth limit and malformed config warns once', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-config-'));
  const nested = path.join(directory, ...Array.from({ length: 10 }, (_, index) => `d${index}`));
  const stderr = process.stderr.write;
  const warnings = [];
  try {
    await mkdir(nested, { recursive: true });
    assert.deepEqual(await loadProjectConfig(nested), {});
    const config = { file: 'scene.html', secs: 8, fps: 60 };
    await writeFile(path.join(directory, 'motion-lab.json'), JSON.stringify(config));
    assert.deepEqual(await loadProjectConfig(nested), config);
    await writeFile(path.join(nested, 'motion-lab.json'), '{bad');
    process.stderr.write = message => {
      warnings.push(String(message));
      return true;
    };
    assert.deepEqual(await loadProjectConfig(nested), {});
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /invalid JSON/);
  } finally {
    process.stderr.write = stderr;
    await rm(directory, { recursive: true, force: true });
  }
});

test('project defaults select the inject scene and export FPS, with flag overrides', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-project-cli-'));
  const scripts = path.resolve('scripts');
  try {
    await writeFile(path.join(directory, 'motion-lab.json'), JSON.stringify({
      file: 'scene.html', fps: 30,
    }));
    const scene = path.join(directory, 'scene.html');
    await writeFile(scene, '<!doctype html><body></body>');
    const injection = await run(process.execPath, [path.join(scripts, 'inject.mjs'), '--json'], {
      cwd: directory,
    });
    assert.equal(injection.code, 0, injection.stderr);
    assert.equal(JSON.parse(injection.stdout).file, 'scene.html');
    const frames = path.join(directory, 'frames');
    await mkdir(frames);
    await checked([
      '-f', 'lavfi', '-i', 'color=c=blue:size=32x32:rate=30', '-frames:v', '3',
      '-start_number', '0', '-y', path.join(frames, '%04d.png'),
    ]);
    for (const override of [undefined, 15]) {
      const output = path.join(directory, `video-${override ?? 'config'}.mp4`);
      const result = await run(process.execPath, [
        path.join(scripts, 'export.mjs'), 'mp4', '--frames', frames, '--out', output,
        ...(override ? ['--fps', String(override)] : []), '--json',
      ], { cwd: directory });
      assert.equal(result.code, 0, result.stderr);
      const metadata = (await probe(output)).data.streams[0];
      assert.equal(metadata.avg_frame_rate, `${override ?? 30}/1`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
