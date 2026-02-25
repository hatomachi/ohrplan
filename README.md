# OCalc Spreadsheet for Obsidian

[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=71368a&label=downloads&query=%24%5B%22ocalc-spreadsheet%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)](https://obsidian.md/plugins?id=ocalc-spreadsheet)

OCalc (Obsidian Calc) is a lightweight, text-based spreadsheet plugin for Obsidian.
It preserves the "plain-text portability" philosophy of Obsidian by using a hybrid `.ocalc` format (YAML Frontmatter + CSV), while providing an intuitive, Excel-like editing experience and LLM-friendly data structure.

*(日本語の説明は下部にあります / Japanese description is available below)*

---

## ✨ Features

* **Excel-like Editing & Drag-and-Drop**: 
  Click to edit cells seamlessly. Reorder rows and columns intuitively using drag-and-drop.
* **Formula Engine**: 
  Define formulas using variables like `{Price} * {Qty}`. Powered by `mathjs`, supporting advanced functions like `round()`.
* **Smart Totals (LLM-Friendly)**: 
  Toggle total rows with a single click. Calculated results are strictly saved in the YAML Frontmatter (not in the CSV body), preventing LLM hallucinations and making it highly parsing-friendly for external scripts.
* **Source View Toggle**: 
  Click the `</>` icon to instantly switch between the spreadsheet UI and the underlying plain-text source (YAML+CSV).
* **Beautiful Embedding**: 
  Embed your `.ocalc` tables into any standard Markdown note using code blocks.
* **i18n Support**: 
  Automatically switches between English and Japanese based on your Obsidian language settings.

## 🚀 Quick Start

1. Open the Command Palette (`Ctrl+P` / `Cmd+P`).
2. Run **"Create new calc table (.ocalc)"**.
3. Right-click column headers to rename them or set formulas.
4. Drag row/column handles to reorganize your table.

### How to Embed
To display a read-only, beautifully rendered table in your normal markdown notes, use the following code block:

\`\`\`ocalc
Untitled.ocalc
\`\`\`

## 📂 The `.ocalc` Format (Example)
OCalc stores data in a clean, version-control-friendly format. The calculation logic and total results are in the Frontmatter, while the pure data remains in the CSV body.

```yaml
---
formulas:
  Cost(USD): "{Price} * {Qty} * {Hours}"
totals:
  showTotalRow: true
  targetColumns:
    - Cost(USD)
  results:
    Cost(USD): 113.32
---
Service,Price,Unit,Qty,Hours,Cost(USD)
EC2(t3.micro),0.0136,USD/hr,150,8,16.32
EBS,0.096,USD/GB-mo,200,4,76.8
RDS,0.026,USD/hr,200,1,5.2
S3,0.025,USD/GB-mo,300,2,15

```

---

# OCalc Spreadsheet (日本語)

OCalc（Obsidian Calc）は、Obsidian内で直感的な表計算を実現する軽量プラグインです。
「プレーンテキストのポータビリティ」というObsidianの思想を守るため、独自バイナリではなく `.ocalc` というハイブリッド拡張子（YAML + CSV）を採用しています。エクセルライクな操作感と、AI（LLM）からの読み書きのしやすさを両立しています。

## ✨ 主な機能

* **シームレスな編集とドラッグ＆ドロップ**:
セルをクリックして直接編集。行のハンドルや列ヘッダーをドラッグ＆ドロップするだけで、直感的に行列の入れ替えが可能です。
* **強力な数式エンジン**:
`{単価} * {数量}` のように列名を変数とした数式を設定できます。`mathjs` を搭載しており、`round()` などの関数にも対応。
* **スマートな合計行（AIフレンドリー設計）**:
ワンクリックで合計行のON/OFFが可能。合計の計算結果はCSV本体ではなく「YAML Frontmatter」に分離して保存されるため、LLMや外部スクリプトが誤読しにくい堅牢な構造になっています。
* **ソースビュー切替**:
タブ右上の `</>` アイコンをクリックすると、スプレッドシート画面と、裏側のプレーンテキスト（YAML+CSV）画面を瞬時に切り替えられます。
* **ノートへの美しい埋め込み**:
Markdownのコードブロック記法を使って、他のノートに計算表を美しく埋め込み表示できます。

## 🚀 使い方

1. コマンドパレット（`Ctrl+P` または `Cmd+P`）を開きます。
2. **「新しい計算表 (.ocalc) を作成」** を実行します。
3. 列のヘッダーを右クリックして、列名の変更や計算式の設定を行います。
4. 行の左端や列ヘッダーをドラッグして、自由に表を並び替えます。

### 他のノートへの埋め込み方法

任意のMarkdownノートに以下のコードブロックを記述すると、計算結果を含む表がプレビュー表示されます。

```ocalc
ファイル名.ocalc
```

## 🛠 インストール方法

*(コミュニティプラグインへの登録が完了次第、ここにインストール手順を記載します)*
