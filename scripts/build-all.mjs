// LINE ミニアプリの3つのチャネル（開発・審査・本番）それぞれの LIFF ID でビルドする。
// 出力：dist/（本番） dist/review/（審査） dist/dev/（開発）
import { build } from 'vite';

const TARGETS = [
  { name: 'published', outDir: 'dist', liffId: '2011766751-1WgmGHs0' },
  { name: 'review', outDir: 'dist/review', liffId: '2011766750-G2SItdGj' },
  { name: 'dev', outDir: 'dist/dev', liffId: '2011766749-X2xkxkP4' },
];

for (const t of TARGETS) {
  process.env.VITE_LIFF_ID = t.liffId;
  console.log(`\n=== build: ${t.name} (${t.outDir}) ===`);
  await build({ build: { outDir: t.outDir, emptyOutDir: true }, logLevel: 'warn' });
}
