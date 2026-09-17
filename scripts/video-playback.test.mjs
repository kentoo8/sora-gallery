import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/video-playback.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { requestVideoPlayback } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);
const denied = () => new DOMException('blocked', 'NotAllowedError');
function video(errors = [], muted = false) {
  return { muted, defaultMuted: muted, attempts: [], async play() {
    this.attempts.push(this.muted);
    const error = errors.shift();
    if (error) throw error;
  } };
}
test('音あり再生が許可されたらミュートしない', async () => {
  const el = video();
  assert.equal(await requestVideoPlayback(el, () => true), 'played');
  assert.deepEqual(el.attempts, [false]);
});
test('音あり再生だけ拒否されたらミュートで再試行', async () => {
  const el = video([denied()]);
  assert.equal(await requestVideoPlayback(el, () => true), 'muted-fallback');
  assert.deepEqual(el.attempts, [false, true]);
});
test('ミュート再生も拒否されたら再生ボタンが必要な結果を返す', async () => {
  const el = video([denied(), denied()]);
  assert.equal(await requestVideoPlayback(el, () => true), 'muted-blocked');
});
test('利用者が選んだミュートを維持し、拒否時に再試行を繰り返さない', async () => {
  const el = video([denied()], true);
  assert.equal(await requestVideoPlayback(el, () => true), 'blocked');
  assert.deepEqual(el.attempts, [true]);
});
test('読み込みエラーと中断を自動ミュートの理由にしない', async () => {
  for (const name of ['NotSupportedError', 'AbortError']) {
    const el = video([new DOMException('failed', name)]);
    assert.equal(await requestVideoPlayback(el, () => true), name === 'AbortError' ? 'cancelled' : 'blocked');
    assert.deepEqual(el.attempts, [false]);
  }
});
test('動画切り替えや手動操作後に古い拒否が届いてもミュートしない', async () => {
  let reject;
  let current = true;
  const el = { muted: false, defaultMuted: false, play: () => new Promise((_, fail) => { reject = fail; }) };
  const pending = requestVideoPlayback(el, () => current);
  current = false;
  reject(denied());
  assert.equal(await pending, 'cancelled');
  assert.equal(el.muted, false);
});
