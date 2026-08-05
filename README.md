# 現場SELECTION v1.0

複数の推しを追うユーザーが、現場候補を比較しながら最適な参戦選択をするための推し活管理アプリ。
サーバー・ログイン機能なし、LocalStorageのみで動作するホテルライク・ダークテーマのWebアプリです。

## 使い方

`index.html` をブラウザで開くだけで動作します（ビルド不要）。
Chart.js / Material Symbols のみCDNから読み込むため、初回はインターネット接続が必要です。

## ファイル構成

```
selection/
├── index.html          エントリーポイント
├── css/style.css        デザインシステム（ダークテーマ・ホテルライク）
├── js/
│   ├── app.js            画面遷移・下部ナビ・FAB管理
│   ├── storage.js         LocalStorage保存/読込・JSONバックアップ
│   ├── data.js            データモデル・初期データ・ID生成
│   ├── calc.js            費用/予算/集計ロジック（UI非依存）
│   ├── utils.js           日付整形・DOM生成・アニメーション等
│   └── views/
│       ├── home.js         ホーム
│       ├── eventList.js    現場一覧
│       ├── eventForm.js    現場登録・編集
│       ├── eventDetail.js  現場詳細
│       ├── compare.js      比較
│       ├── calendar.js     カレンダー
│       ├── dashboard.js    ダッシュボード
│       └── settings.js     設定
└── README.md
```

## データ保存

LocalStorageキー: `genbaSelectionData`

```json
{
  "appInfo": {},
  "settings": {},
  "favorites": [],
  "categories": [],
  "events": []
}
```

すべての変更操作（追加・編集・ステータス変更等）で自動保存されます。削除操作は現場データについては
誤操作防止のためv1.0では実装していません（推し・グループ・カテゴリーは設定画面から削除可能）。

## v2以降候補

年間推し活レポート／チケット詳細管理／座席管理／遠征管理／写真保存／通知機能
