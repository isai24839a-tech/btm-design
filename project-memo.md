# BEAT THE MIX ダンススタジオ HP＆予約システムPJ

## プロジェクト概要
- 家族経営のダンススタジオ「BEAT THE MIX」の新HP作成 + 予約システム導入
- 個人プロジェクト（仕事とは無関係）
- 作業ディレクトリ: `C:\Users\shirasaki910\Desktop\dance-studio\`

## 現在のステータス
**Phase**: デザイン案レビュー待ち（v3追加済み・全9案完成）

## 完了済み
- [x] 既存サイト(tibadance.com)からPuppeteerで全ページ情報取得
- [x] サイト情報まとめ (`site-info.md`)
- [x] デザイン案A: Energy Pop (`design-a-energy.html`) — オレンジ基調、エネルギッシュ
- [x] デザイン案B: Clean Modern (`design-b-modern.html`) — ミニマル、上品
- [x] デザイン案C: Street Vibe (`design-c-dark.html`) — ダークテーマ、ネオン
- [x] デザイン案D: Cinematic Gold (`design-d-cinematic.html`) — 黒×ゴールド、パララックス、文字アニメーション
- [x] デザイン案E: Glassmorphism Aurora (`design-e-glass.html`) — オーロラ背景、すりガラス、3Dティルト
- [x] デザイン案F: Magazine Editorial (`design-f-editorial.html`) — 雑誌風レイアウト、非対称グリッド、タイポグラフィ
- [x] デザイン案G: Studio Premium (`design-g-premium.html`) — NOA/En Dance Studio風、11セクション、ギャラリー、カウンターアニメーション
- [x] デザイン案H: Split Dynamic (`design-h-dynamic.html`) — EXPG/STEEZY風、スプリットレイアウト、水平スクロール、マーキー
- [x] デザイン案I: Warm Creative (`design-i-warm.html`) — クリーム×コーラル、有機ブロブ形状、SVGウェーブ、12セクション
- [x] 比較ページ (`index.html`) — 全9案を3段表示（v3 NEW / v2 / v1）
- [x] GitHub Pages公開: https://isai24839a-tech.github.io/btm-design/
- [x] WordPress.comプラン分析 (`wp-plan-analysis.md`)

## 次にやること
- [ ] ユーザーがデザイン方向性を決定
- [ ] 決定したデザインをWordPressテーマに変換
- [ ] 予約システム（STORES予約推奨）のセットアップ
- [ ] 会員管理機能の実装
- [ ] WordPress.com Personalプラン契約 & デプロイ

## 技術方針
- WordPress.com Personal ($4/月・2年払い) でHP
- STORES予約（無料プラン）で予約＋会員管理
- 合計月額: 約500円

## スタジオ基本情報
- 名前: BEAT THE MIX (BTM)
- 所在: 千葉市（若葉・稲毛・千葉・美浜の計7スタジオ）
- 2部門: KIDS(4-18歳) / FUTURE(40歳以上)
- 料金: チケット制（KIDS 6,000円/4回〜、FUTURE 8,000円/4回）
- インストラクター: JUNJUN先生(Dance歴32年)、NANAMI先生(ダンス歴20年)
- 連絡先: 090-1817-9501 / beat.the.mix7386@gmail.com

## ファイル構成
```
C:\Users\shirasaki910\Desktop\dance-studio\
├── index.html              # デザイン比較ページ（6案一覧）
├── design-a-energy.html    # Design A: Energy Pop
├── design-b-modern.html    # Design B: Clean Modern
├── design-c-dark.html      # Design C: Street Vibe
├── design-d-cinematic.html # Design D: Cinematic Gold (v2)
├── design-e-glass.html     # Design E: Glassmorphism Aurora (v2)
├── design-f-editorial.html # Design F: Magazine Editorial (v2)
├── design-g-premium.html   # Design G: Studio Premium (v3)
├── design-h-dynamic.html   # Design H: Split Dynamic (v3)
├── design-i-warm.html      # Design I: Warm Creative (v3)
├── site-info.md            # 既存サイトから取得した全情報
├── wp-plan-analysis.md     # WPプラン＆予約システム分析
├── project-memo.md         # このファイル（PJ進捗メモ）
├── scrape.js / scrape2.js  # スクレイピングスクリプト
├── scraped/                # 取得したテキスト・HTML・スクリーンショット
├── node_modules/           # Puppeteer等
└── package.json
```

## 注意事項
- 個人PJのためDropbox/claude_memory(GitHub同期)には保存しない
- auto-memoryに参照だけ記載
- GitHubリポ: https://github.com/isai24839a-tech/btm-design (public)
