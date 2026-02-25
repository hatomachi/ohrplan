import { Plugin, WorkspaceLeaf, TFile, parseYaml } from 'obsidian';
import { HRPlanView, VIEW_TYPE_HRPLAN, t } from './MyCalcView';
import * as Papa from 'papaparse';
import * as math from 'mathjs';

export default class HRPlanPlugin extends Plugin {
	async onload() {
		this.registerView(
			VIEW_TYPE_HRPLAN,
			(leaf: WorkspaceLeaf) => new HRPlanView(leaf)
		);
		this.registerExtensions(['hrplan'], VIEW_TYPE_HRPLAN);

		this.addCommand({
			id: 'create-hrplan-file',
			name: "新しい要員計画 (.hrplan) を作成",
			callback: async () => {
				await this.createNewHRPlanFile();
			}
		});

		this.registerMarkdownCodeBlockProcessor('hrplan', async (source, el, ctx) => {
			const fileName = source.trim();
			if (!fileName) return;

			const file = this.app.metadataCache.getFirstLinkpathDest(fileName, ctx.sourcePath);

			if (file instanceof TFile && file.extension === 'hrplan') {
				const data = await this.app.vault.cachedRead(file);
				this.renderEmbed(el, data, file.basename);
			} else {
				const errorBox = el.createDiv();
				errorBox.style.color = "var(--text-error)";
				errorBox.style.border = "1px solid var(--background-modifier-error)";
				errorBox.style.padding = "8px";
				errorBox.style.borderRadius = "4px";
				errorBox.innerText = `⚠️ File not found / ファイルが見つかりません: ${fileName}`;
			}
		});
	}

	async createNewHRPlanFile() {
		let fileName = 'Untitled.hrplan';
		let fileNumber = 1;
		while (this.app.vault.getAbstractFileByPath(fileName)) {
			fileName = `Untitled ${fileNumber}.hrplan`;
			fileNumber++;
		}
		const initialData = `---
period: "2026/4-2027/3"
months:
  - "2026/4"
  - "2026/5"
  - "2026/6"
  - "2026/7"
  - "2026/8"
  - "2026/9"
  - "2026/10"
  - "2026/11"
  - "2026/12"
  - "2027/1"
  - "2027/2"
  - "2027/3"
themes:
  - name: "AEOシステム EKS verup対応"
    description: "サンプルテーマ"
  - name: "BCQシステム 新規構築"
    description: "サンプルテーマ2"
members:
  - name: "田中"
    description: "リーダー"
    price: 3000
  - name: "山田"
    description: "メンバー"
    price: 2000
totals: {}
---
"Member","Theme","2026/4","2026/5","2026/6","2026/7","2026/8","2026/9","2026/10","2026/11","2026/12","2027/1","2027/2","2027/3"
"田中","AEOシステム EKS verup対応",0.20,0.20,0,0,0,0,0,0,0,0,0,0
"田中","BCQシステム 新規構築",0.10,0.10,0,0,0,0,0,0,0,0,0,0
`;
		try {
			const file = await this.app.vault.create(fileName, initialData);
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(file);
		} catch (e) {
			console.error("Error creating file", e);
		}
	}

	renderEmbed(container: HTMLElement, rawData: string, titleStr: string) {
		// HRPlan の埋め込みビュー (簡易版)
		const title = container.createEl('h4', { text: `📊 ${titleStr}` });
		title.style.marginTop = "0";
		title.style.marginBottom = "12px";
		title.style.color = "var(--text-normal)";
		const desc = container.createEl('p', { text: "埋め込み表示は未実装です。プラグインで.hrplanドキュメント自体を開いて確認してください。" });
		desc.style.color = "var(--text-muted)";
	}
}