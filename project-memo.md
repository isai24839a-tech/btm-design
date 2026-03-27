# BEAT THE MIX ダンススタジオ HP＆予約システムPJ

## プロジェクト概要
- 家族経営のダンススタジオ「BEAT THE MIX」の新HP作成 + 予約システム導入
- 個人プロジェクト（仕事とは無関係）
- 作業ディレクトリ: `C:\Users\shirasaki910\Desktop\dance-studio\`

## 現在のステータス
**Phase**: デザイン確定・パフォーマンス最適化完了 → GAS再デプロイ → tibadance.com本番化

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

## 完了済み（SEO対策 2026-03-23）
- [x] **JSON-LD構造化データ追加**: 全公開ページにDanceSchoolスキーマ（トップ/KIDS/FUTURE）、Blogスキーマ（ニュース2ページ）
  - Googleが「ダンス教室」として認識できる。教室名/住所/電話/料金/講師/Instagram/サービスエリア等を構造化
- [x] **OGPタグ追加**: og:title/description/type/url/site_name/locale + Twitter Card（全6ページ）
  - LINEやTwitterでシェアされた時にタイトル・説明文が表示される
- [x] **metaタグ強化**:
  - title改善（「千葉市」「4〜18歳」「40歳以上」等のキーワード追加）
  - description追加/改善（split-landing.htmlに新規追加）
  - robots明示（公開ページ=index,follow / 会員ページ=noindex,nofollow）
  - canonical URL設定
- [x] **セマンティックHTML**: split-landing.htmlのロゴを`<h1>`タグ化
- [x] **注意**: canonical/OGP URLは現在GitHub Pages（isai24839a-tech.github.io）→ tibadance.com移行時に要変更

## 完了済み（GAS本番化+管理改善 2026-03-23〜24）
- [x] **GAS本番接続**: スプレッドシート作成→GASデプロイ→DEMO_MODE=false
- [x] **スマホ予約テスト**: スマホ→予約→スプレッドシート反映→メール通知 全て動作確認済み
- [x] **スタジオフィルター**: 管理者フォームのカテゴリ選択廃止→KIDS/FUTUREトグル自動連動
- [x] **FUTURE色テーマ**: 予約ボタン/タグ/モーダル等をネイビーに分離
- [x] **予約確認メール改善**: 返信不可の注記+キャンセルはLINE連絡に変更
- [x] **スプレッドシート列幅**: GAS API経由で全シート自動調整

## 完了済み（デザイン改善+会員ページ修正 2026-03-24）
- [x] **NOA風3REASONSセクション**: KIDS/FUTURE両ページにスクロールリビール付き「選ばれる3つの理由」追加
- [x] **お知らせGAS API化**: Visualization API→GAS API経由に変更（スプレッドシート公開設定不要）
- [x] **定期レッスンGAS API化**: 同上+GASに`regularLessons`エンドポイント追加
- [x] **パスワード表示ボタン改善**: 目のアイコンの透明度を上げて視認性向上
- [x] **Instagram埋め込み**: KIDS3件/FUTURE3件の手動埋め込み
- [x] **公式ロゴ配置**: トップ右下にBTMロゴ（控えめ配置）
- [x] **先生写真配置**: NANAMI先生(nanami_profile.png)/JUNJUN先生(32.jpg)

## 完了済み（パフォーマンス最適化+ファビコン+OGP 2026-03-25）
- [x] **家族デザイン確認OK**: このデザインで確定
- [x] **WebP画像変換**: 使用中の7画像をWebPに変換（2,794KB→610KB、78%削減）。nanami_profile 92%削減
- [x] **Google Fonts非同期読み込み**: `rel="preload"` + `onload`パターンで全6ページ適用。レンダーブロック3.7秒を完全排除
- [x] **Instagram遅延読み込み**: IntersectionObserverでギャラリー表示時のみembed.js読み込み
- [x] **content-visibility: auto**: 画面外セクションのレンダリングをスキップ
- [x] **モバイル軽量化（半分キープ）**: blob 2/5残し、dot 3/7残し、パーティクル半減、wave全高維持
- [x] **PC限定キラキラエフェクト**: トップ（マウス追従グロー、ホバーシャイン）、KIDS（タイトルシマー、カードシャイン、CTAグロー）、FUTURE（ゴールドスウィープ、パーティクル倍増max120）
- [x] **PageSpeedスコア**: モバイル70→97、PC98達成（FCP 4.3s→0.8s）
- [x] **btm_logo.webpリサイズ**: 640x640→120x120（60KB→6KB）
- [x] **ファビコン**: 6サイズ生成（ico/16/32/180/192/512）、全6ページにlink追加
- [x] **OGP画像**: トップ/KIDS/FUTURE各1枚（1200x630）作成、og:image+twitter:image設定
- [x] **GAS再デプロイ手順書**: `GAS_REDEPLOY_INSTRUCTIONS.md` 作成（完全なコード+手順）

## 完了済み（Cloudflare Pages移行+画像添付機能 2026-03-27）
- [x] **Cloudflare Pages デプロイ**: `btm-design.pages.dev` で公開中（GitHub push自動デプロイ）
- [x] **URL一括置換**: GitHub Pages → tibadance.com（43箇所）
- [x] **split-landing.html → index.html**: トップページとしてリネーム
- [x] **.gitignore整備**: node_modules/scraped/開発ツール除外
- [x] **お知らせ画像添付機能**: 管理者が最大5枚の画像を添付可能。Google Drive自動保存。削除時もDriveから自動削除

## 次にやること
- [ ] **★GAS再デプロイ**: GAS_REDEPLOY_INSTRUCTIONS.mdの手順に従い手動でコピペ+再デプロイ（セキュリティ修正+画像添付機能）
- [ ] **★GAS再デプロイ後**: お知らせシートE1に「画像」ヘッダー追加 or setupSheets()再実行
- [ ] **★定期レッスンデータ入力**: スプレッドシートの「定期レッスン」シートに曜日/スタジオ/時間/クラス/カテゴリを入力
- [ ] **Google Search Console登録**: サイトマップ送信
- [ ] tibadance.comドメイン移管（Jimdo → Cloudflare DNS）
- [ ] tibadance.comをCloudflare Pagesにカスタムドメイン追加
- [ ] 実データでの動作確認テスト
- [ ] 旧サイト（GitHub Pages / Jimdo）停止

## ファイル構成
```
C:\Users\shirasaki910\Desktop\dance-studio\
├── split-landing.html      # ★トップ: KIDS/FUTURE振り分け
├── kids-page.html           # KIDSメインサイト
├── future-page.html         # FUTUREメインサイト
├── kids-news.html           # KIDSニュース/ブログ
├── future-news.html         # FUTUREニュース/ブログ
├── members-page.html        # 会員専用(パスワード認証)
├── booking-script.gs        # 予約システム用Apps Scriptコード
├── GAS_REDEPLOY_INSTRUCTIONS.md  # GAS再デプロイ手順書
├── favicon.ico              # ファビコン（16+32+48マルチサイズ）
├── favicon-16x16.png        # ファビコン16px
├── favicon-32x32.png        # ファビコン32px
├── apple-touch-icon.png     # Apple用180px
├── android-chrome-192x192.png  # Android用192px
├── android-chrome-512x512.png  # Android用512px
├── index.html               # デザイン比較ページ（全9案一覧）
├── design-[a-i]-*.html      # デザイン案A〜I
├── site-info.md             # 既存サイト情報
├── wp-plan-analysis.md      # WPプラン分析（参考）
├── images/                  # 写真素材+WebP+OGP
│   ├── *.jpg / *.png        # オリジナル写真（51JPG+1PNG+1MP4）
│   ├── *.webp               # WebP変換済み（7ファイル）
│   └── ogp-*.png            # OGP画像（3ファイル: top/kids/future）
├── project-memo.md          # このファイル
├── scrape.js / scrape2.js   # スクレイピングスクリプト
└── scraped/                 # 取得データ
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
