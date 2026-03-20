# BEAT THE MIX ダンススタジオ HP＆予約システムPJ

## プロジェクト概要
- 家族経営のダンススタジオ「BEAT THE MIX」の新HP作成 + 予約システム導入
- 個人プロジェクト（仕事とは無関係）
- 作業ディレクトリ: `C:\Users\shirasaki910\Desktop\dance-studio\`

## 現在のステータス
**Phase**: サイト機能ほぼ完成 — 家族デザイン確認待ち → 写真素材 → 本番化

## 技術方針（2026-03-18 変更）
- **ホスティング**: Cloudflare Pages（無料）← WordPress.com廃止
- **予約システム**: Google Sheets + Apps Script（無料）← 月3万円の外部アプリ「フリー」廃止
- **コンテンツ管理**: Google Spreadsheet（家族がスマホで編集するだけ）
- **合計月額: 0円**

## サイト構成
```
split-landing.html (トップ)
├── kids-page.html (KIDSサイト) ── kids-news.html (KIDSブログ)
├── future-page.html (FUTUREサイト) ── future-news.html (FUTUREブログ)
└── members-page.html (会員専用)
     ├── スケジュール (Google Sheets自動表示)
     ├── 予約 (Google Apps Script)
     ├── 予約一覧 (日付別・誰が入ってるか一覧)
     └── お知らせ (Google Sheets自動表示)
```

## Google Spreadsheet構成（1つのスプレッドシートで全管理）
| シート名 | 用途 | 列構成 |
|---------|------|--------|
| スケジュール | 予約枠管理 | 日付/スタジオ/時間/クラス/定員 |
| 予約一覧 | 予約データ自動記録 | 日付/スタジオ/時間/クラス/お名前/電話番号/予約日時 |
| お知らせ | 会員向け通知 | 日付/タイトル/内容/重要度 |
| KIDSニュース | KIDSブログ | 日付/タイトル/内容/カテゴリ/画像URL |
| FUTUREニュース | FUTUREブログ | 日付/タイトル/内容/カテゴリ/画像URL |

## 完了済み
- [x] 既存サイト(tibadance.com)からPuppeteerで全ページ情報取得
- [x] サイト情報まとめ (`site-info.md`)
- [x] デザイン案9案完成 (A〜I) + 比較ページ
- [x] GitHub Pages公開
- [x] **スプリットランディングページ** (`split-landing.html`) — KIDS/FUTURE振り分け、ホバーで拡大
- [x] **KIDSページ** (`kids-page.html`) — オレンジ/コーラル、全セクション完成
- [x] **FUTUREページ** (`future-page.html`) — ネイビー/ゴールド、全セクション完成
- [x] **会員ページ** (`members-page.html`) — パスワード認証、4タブ(スケジュール/予約/予約一覧/お知らせ)
- [x] **予約システム** (`booking-script.gs`) — Google Apps Script、満員チェック/重複防止/メール通知
- [x] **KIDSニュース** (`kids-news.html`) — Google Sheets連携ブログ、カテゴリバッジ
- [x] **FUTUREニュース** (`future-news.html`) — ダーク×ゴールドのマガジン風ブログ
- [x] **お知らせ機能** — 会員ページ内、Google Sheets連携、重要バッジ対応
- [x] **デモモード** — 予約テスト用、sessionStorageで動作（DEMO_MODE=true）
- [x] **予約一覧タブ** — 日付別グループ化、誰が入ってるか一目でわかる
- [x] **メール通知** — 予約時にbeat.the.mix7386@gmail.comへ自動通知
- [x] **体験レッスン申し込みボタン** — GoogleフォームURL設定済み
- [x] **フローティング体験バナー** — スクロールで表示、×で閉じれる
- [x] **FAQ** — KIDS/FUTURE各6問、アコーディオン形式
- [x] **生徒・保護者の声** — エキテン実口コミ、自動スクロールカルーセル（KIDS:8件/FUTURE:6件）
- [x] **Instagram連携** — @beat_the_mix_kids / @beat_the_mix_future リンク設定
- [x] **ナビ日本語化** — 全リンクを日本語に変更
- [x] **インストラクター充実** — 実績・メッセージ追加、1人フォーカスレイアウト
- [x] **先生割り当て修正** — KIDS=NANAMI先生 / FUTURE=JUNJUN先生

## 次にやること
- [ ] 家族にデザイン確認してもらう（GitHub Pagesプレビュー）
- [ ] 写真素材をフォルダで受け取り → ギャラリーに配置
- [ ] Google Spreadsheetを作成してシート5つ作る
- [ ] Google Apps Scriptをデプロイ（booking-script.gs）
- [ ] SPREADSHEET_ID / APPS_SCRIPT_URL を各HTMLに設定
- [ ] DEMO_MODE = false に変更
- [ ] Cloudflare Pagesにデプロイ
- [ ] tibadance.comドメイン移管（Jimdo → Cloudflare）
- [ ] 実データでの動作確認テスト
- [ ] 旧サイト停止

## ファイル構成
```
C:\Users\shirasaki910\Desktop\dance-studio\
├── split-landing.html     # ★トップ: KIDS/FUTURE振り分け
├── kids-page.html          # KIDSメインサイト
├── future-page.html        # FUTUREメインサイト
├── kids-news.html          # KIDSニュース/ブログ
├── future-news.html        # FUTUREニュース/ブログ
├── members-page.html       # 会員専用(パスワード認証)
├── booking-script.gs       # 予約システム用Apps Scriptコード
├── index.html              # デザイン比較ページ（全9案一覧）
├── design-[a-i]-*.html     # デザイン案A〜I
├── site-info.md            # 既存サイト情報
├── wp-plan-analysis.md     # WPプラン分析（参考）
├── project-memo.md         # このファイル
├── scrape.js / scrape2.js  # スクレイピングスクリプト
└── scraped/                # 取得データ
```

## スタジオ基本情報
- 名前: BEAT THE MIX (BTM)
- 所在: 千葉市（若葉・稲毛・千葉・美浜の計7スタジオ）
- 2部門: KIDS(4-18歳) / FUTURE(40歳以上)
- 料金: チケット制（KIDS 6,000円/4回〜、FUTURE 8,000円/4回）
- インストラクター: KIDS=NANAMI先生(ダンス歴20年) / FUTURE=JUNJUN先生(Dance歴32年)
- 連絡先: 090-1817-9501 / beat.the.mix7386@gmail.com
- Instagram: @beat_the_mix_kids / @beat_the_mix_future
- 体験申し込みGoogleフォーム: https://docs.google.com/forms/d/e/1FAIpQLSck2gvaKBhbpE8hJqAwyume9r-ghJhlEAOaOUUXefHl5jGflQ/viewform

## 会員ページ設定
- 会員パスワード: `btm2025`（members-page.html内のPASSWORD変数）
- 管理者パスワード: `btmadmin2026`（同じパスワード画面から管理モードに入る）

## 注意事項
- 個人PJのためDropbox/claude_memory(GitHub同期)には保存しない
- auto-memoryに参照だけ記載
- GitHubリポ: https://github.com/isai24839a-tech/btm-design (public)
- 住所は書いちゃいけない制約あり（アクセスマップはスキップ）
