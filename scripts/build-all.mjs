// LINE ミニアプリの3つのチャネル（開発・審査・本番）それぞれの LIFF ID でビルドする。
// 出力：dist/（本番） dist/review/（審査） dist/dev/（開発）
import { build } from 'vite';

const TARGETS = [
  { name: 'published', outDir: 'dist', liffId: '2011775290-FdfRXbUa' },
  { name: 'review', outDir: 'dist/review', liffId: '2011775289-B6HwD6QH' },
  { name: 'dev', outDir: 'dist/dev', liffId: '2011775288-2kkIglju' },
];

for (const t of TARGETS) {
  process.env.VITE_LIFF_ID = t.liffId;
  console.log(`\n=== build: ${t.name} (${t.outDir}) ===`);
  await build({ build: { outDir: t.outDir, emptyOutDir: true }, logLevel: 'warn' });
}
