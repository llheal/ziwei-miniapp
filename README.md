# 紫微斗数 命盤診断（LINEミニアプリ）

生年月日と出生時刻から紫微斗数の命盤を作成し、性格・恋愛・仕事・金運を読み解くLINEミニアプリ。

- 命盤計算：[iztro](https://github.com/SylarLong/iztro)（端末内で計算、サーバー送信なし）
- LINE連携：LIFF SDK（シェア：shareTargetPicker、課金：LINEミニアプリ アプリ内課金）
- 配信：GitHub Pages（`dist/` 本番、`dist/review/` 審査、`dist/dev/` 開発）

## 開発

```bash
npm install
npm run dev        # ローカル確認（LIFF ID未設定なら通常ブラウザとして動作）
npm run build:all  # 3チャネル分をビルド
```
