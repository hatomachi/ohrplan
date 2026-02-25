import { TextFileView, WorkspaceLeaf, parseYaml, stringifyYaml, Menu, Modal, App, Setting } from 'obsidian';
import * as Papa from 'papaparse';
import * as math from 'mathjs';

export const VIEW_TYPE_HRPLAN = 'hrplan-view';

export function t(key: string): string {
    return key; // 簡易版i18n
}

type HRPlanFrontmatter = {
    period: string;
    months: string[];
    themes: { name: string, description: string }[];
    members: { name: string, description: string, price: number }[];
    totals: any;
};

// ==========================================
// メインビュークラス
// ==========================================
export class HRPlanView extends TextFileView {
    data: string = "";
    private activeTab: 'member_to_theme' | 'theme_to_member' | 'master' | 'source' = 'member_to_theme';

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        // アクションボタン（右上）
        this.addAction('users', 'メンバー＞テーマ順', () => { this.activeTab = 'member_to_theme'; this.renderUI(); });
        this.addAction('layers', 'テーマ＞メンバー順', () => { this.activeTab = 'theme_to_member'; this.renderUI(); });
        this.addAction('settings', 'マスタ設定', () => { this.activeTab = 'master'; this.renderUI(); });
        this.addAction('code', 'ソース表示', () => { this.activeTab = 'source'; this.renderUI(); });
    }

    getViewType(): string { return VIEW_TYPE_HRPLAN; }
    getDisplayText(): string { return this.file ? this.file.basename : 'HRPlan'; }
    getViewData(): string { return this.data; }
    setViewData(data: string, clear: boolean): void { this.data = data; this.renderUI(); }
    clear(): void { this.data = ""; this.renderUI(); }

    parseData(raw: string) {
        let yamlStr = ""; let csvStr = raw; let frontmatter: Partial<HRPlanFrontmatter> = {};
        if (raw.startsWith("---\n")) {
            const endIdx = raw.indexOf("\n---\n", 4);
            if (endIdx !== -1) {
                yamlStr = raw.substring(4, endIdx);
                csvStr = raw.substring(endIdx + 5).replace(/^[\r\n]+/, '');
                try { frontmatter = parseYaml(yamlStr) || {}; } catch (e) { }
            }
        }

        // デフォルトマスタ情報補完
        if (!frontmatter.months) frontmatter.months = ["2026/4", "2026/5", "2026/6"];
        if (!frontmatter.themes) frontmatter.themes = [];
        if (!frontmatter.members) frontmatter.members = [];

        const parsedCsv = Papa.parse(csvStr, { header: true, skipEmptyLines: false });
        // 必須カラム："Member", "Theme", ＋ Months
        const expectedFields = ["Member", "Theme", ...(frontmatter.months)];
        if (!parsedCsv.meta.fields || parsedCsv.meta.fields.length === 0) {
            parsedCsv.meta.fields = expectedFields;
        } else {
            expectedFields.forEach(f => {
                const currentFields = parsedCsv.meta.fields || [];
                if (!currentFields.includes(f)) {
                    currentFields.push(f);
                }
                parsedCsv.meta.fields = currentFields;
            });
        }

        if (!parsedCsv.data || parsedCsv.data.length === 0) {
            parsedCsv.data = [];
        }

        return { frontmatter: frontmatter as HRPlanFrontmatter, data: parsedCsv.data, meta: parsedCsv.meta };
    }

    saveData(frontmatter: HRPlanFrontmatter, data: any[], meta: Papa.ParseMeta) {
        // 保存時に totals を計算してセット
        frontmatter.totals = frontmatter.totals || {};
        frontmatter.totals.results = {};

        frontmatter.months.forEach(month => {
            let sum = 0;
            data.forEach((row: any) => {
                const val = parseFloat(row[month]);
                if (!isNaN(val)) { sum += val; }
            });
            frontmatter.totals.results[month] = Number(math.format(sum, { precision: 14 }));
        });

        const yamlStr = stringifyYaml(frontmatter);
        const fields = meta.fields || [];
        const csvStr = Papa.unparse({ fields: fields, data: data });
        this.data = `---\n${yamlStr}---\n${csvStr}`;
        this.requestSave();
    }

    updateCellValue(frontmatter: HRPlanFrontmatter, data: any[], meta: Papa.ParseMeta, memberName: string, themeName: string, month: string, value: string) {
        let numericValue = parseFloat(value);
        if (isNaN(numericValue)) numericValue = 0;

        // 対象行を探す
        let targetRow = data.find((r: any) => r["Member"] === memberName && r["Theme"] === themeName);
        if (!targetRow) {
            targetRow = { "Member": memberName, "Theme": themeName };
            meta.fields?.forEach(field => {
                if (field !== "Member" && field !== "Theme") {
                    targetRow[field] = 0;
                }
            });
            data.push(targetRow);
        }
        targetRow[month] = numericValue;
        this.saveData(frontmatter, data, meta);
        this.renderUI();
    }

    renderUI() {
        const container = this.contentEl;
        container.empty();

        if (this.activeTab === 'source') {
            const textarea = container.createEl('textarea');
            textarea.value = this.data;
            textarea.style.width = "100%";
            textarea.style.height = "100%";
            textarea.style.minHeight = "400px";
            textarea.style.padding = "16px";
            textarea.style.background = "var(--background-secondary)";
            textarea.style.color = "var(--text-normal)";
            textarea.style.border = "1px solid var(--background-modifier-border)";
            textarea.style.borderRadius = "8px";
            textarea.style.fontFamily = "var(--font-monospace)";
            textarea.style.resize = "vertical";

            textarea.onblur = (e) => {
                const newData = (e.target as HTMLTextAreaElement).value;
                if (newData !== this.data) {
                    this.data = newData;
                    this.requestSave();
                }
            };
            return;
        }

        const title = container.createEl('h2', { text: `📊 ${this.getDisplayText()}` });
        title.style.marginBottom = "20px";
        if (!this.data) return;

        const parsed = this.parseData(this.data);

        // タブ切り替えUI
        const tabContainer = container.createDiv();
        tabContainer.style.display = "flex";
        tabContainer.style.gap = "10px";
        tabContainer.style.marginBottom = "20px";
        tabContainer.style.borderBottom = "1px solid var(--background-modifier-border)";
        tabContainer.style.paddingBottom = "10px";

        const createTabBtn = (label: string, tabId: 'member_to_theme' | 'theme_to_member' | 'master') => {
            const btn = tabContainer.createEl('button', { text: label });
            if (this.activeTab === tabId) {
                btn.style.background = "var(--interactive-accent)";
                btn.style.color = "var(--text-on-accent)";
            }
            btn.onclick = () => { this.activeTab = tabId; this.renderUI(); };
        };

        createTabBtn('1. メンバー ＞ テーマ', 'member_to_theme');
        createTabBtn('2. テーマ ＞ メンバー', 'theme_to_member');
        createTabBtn('⚙️ マスタ設定', 'master');

        const contentContainer = container.createDiv();
        contentContainer.style.overflowX = "auto";

        if (this.activeTab === 'master') {
            this.renderMasterTab(contentContainer, parsed);
        } else if (this.activeTab === 'member_to_theme') {
            this.renderPivotTable(contentContainer, parsed, 'member', 'theme');
        } else if (this.activeTab === 'theme_to_member') {
            this.renderPivotTable(contentContainer, parsed, 'theme', 'member');
        }
    }

    renderMasterTab(container: HTMLElement, parsed: any) {
        const fm = parsed.frontmatter as HRPlanFrontmatter;
        container.createEl('h3', { text: '対象期間 / 月' });
        const periodDiv = container.createDiv({ text: `Period: ${fm.period}` });
        periodDiv.style.marginBottom = "8px";
        const monthsDiv = container.createDiv({ text: `Months: ${fm.months.join(", ")}` });
        monthsDiv.style.marginBottom = "20px";

        // テーマ一覧
        const themeHeaderDiv = container.createDiv();
        themeHeaderDiv.style.display = "flex";
        themeHeaderDiv.style.justifyContent = "space-between";
        themeHeaderDiv.style.alignItems = "center";
        themeHeaderDiv.createEl('h3', { text: 'テーマ一覧' });
        const addThemeBtn = themeHeaderDiv.createEl('button', { text: '+ テーマ追加' });
        addThemeBtn.onclick = () => {
            fm.themes.push({ name: "新規テーマ", description: "" });
            this.saveData(fm, parsed.data, parsed.meta);
            this.renderUI();
        };

        const themeTable = container.createEl('table');
        themeTable.style.width = "100%"; themeTable.style.marginBottom = "20px";
        const tHead = themeTable.createEl('thead').createEl('tr');
        tHead.createEl('th', { text: '名前' });
        tHead.createEl('th', { text: '説明' });
        tHead.createEl('th', { text: '操作', attr: { width: "60px" } });

        const tBody = themeTable.createEl('tbody');
        fm.themes.forEach((t, i) => {
            const tr = tBody.createEl('tr');
            const nameTd = tr.createEl('td', { text: t.name });
            nameTd.style.border = "1px solid var(--background-modifier-border)";
            nameTd.setAttribute('contenteditable', 'true');
            nameTd.onblur = (e) => {
                const newName = (e.target as HTMLElement).innerText.trim();
                if (newName && newName !== t.name) {
                    // 既存データ(CSV)の名前も更新する
                    parsed.data.forEach((row: any) => {
                        if (row["Theme"] === t.name) {
                            row["Theme"] = newName;
                        }
                    });
                    t.name = newName;
                    this.saveData(fm, parsed.data, parsed.meta);
                }
            };

            const descTd = tr.createEl('td', { text: t.description || "" });
            descTd.style.border = "1px solid var(--background-modifier-border)";
            descTd.setAttribute('contenteditable', 'true');
            descTd.onblur = (e) => {
                t.description = (e.target as HTMLElement).innerText.trim();
                this.saveData(fm, parsed.data, parsed.meta);
            };

            const actionTd = tr.createEl('td');
            actionTd.style.border = "1px solid var(--background-modifier-border)";
            actionTd.style.textAlign = "center";
            const delBtn = actionTd.createEl('button', { text: '削除' });
            delBtn.onclick = () => {
                fm.themes.splice(i, 1);
                // CSV上のデータは保持する（あるいは削除するかは要件次第だが、とりあえずマスタから消すだけ）
                this.saveData(fm, parsed.data, parsed.meta);
                this.renderUI();
            };
        });

        // メンバー一覧
        const memHeaderDiv = container.createDiv();
        memHeaderDiv.style.display = "flex";
        memHeaderDiv.style.justifyContent = "space-between";
        memHeaderDiv.style.alignItems = "center";
        memHeaderDiv.createEl('h3', { text: 'メンバー一覧' });
        const addMemBtn = memHeaderDiv.createEl('button', { text: '+ メンバー追加' });
        addMemBtn.onclick = () => {
            fm.members.push({ name: "新規メンバー", description: "", price: 0 });
            this.saveData(fm, parsed.data, parsed.meta);
            this.renderUI();
        };

        const memTable = container.createEl('table');
        memTable.style.width = "100%"; memTable.style.marginBottom = "20px";
        const mHead = memTable.createEl('thead').createEl('tr');
        mHead.createEl('th', { text: '名前' });
        mHead.createEl('th', { text: '説明' });
        mHead.createEl('th', { text: '単価(千円/MM)' });
        mHead.createEl('th', { text: '操作', attr: { width: "60px" } });

        const mBody = memTable.createEl('tbody');
        fm.members.forEach((m, i) => {
            const tr = mBody.createEl('tr');

            const nameTd = tr.createEl('td', { text: m.name });
            nameTd.style.border = "1px solid var(--background-modifier-border)";
            nameTd.setAttribute('contenteditable', 'true');
            nameTd.onblur = (e) => {
                const newName = (e.target as HTMLElement).innerText.trim();
                if (newName && newName !== m.name) {
                    // 既存データ(CSV)の名前も更新する
                    parsed.data.forEach((row: any) => {
                        if (row["Member"] === m.name) {
                            row["Member"] = newName;
                        }
                    });
                    m.name = newName;
                    this.saveData(fm, parsed.data, parsed.meta);
                }
            };

            const descTd = tr.createEl('td', { text: m.description || "" });
            descTd.style.border = "1px solid var(--background-modifier-border)";
            descTd.style.cursor = "text";
            descTd.setAttribute('contenteditable', 'true');
            descTd.onblur = (e) => {
                m.description = (e.target as HTMLElement).innerText.trim();
                this.saveData(fm, parsed.data, parsed.meta);
            };

            const priceTd = tr.createEl('td', { text: String(m.price || 0) });
            priceTd.style.border = "1px solid var(--background-modifier-border)";
            priceTd.style.cursor = "text";
            priceTd.setAttribute('contenteditable', 'true');
            priceTd.onblur = (e) => {
                m.price = parseFloat((e.target as HTMLElement).innerText.trim()) || 0;
                this.saveData(fm, parsed.data, parsed.meta);
            };

            const actionTd = tr.createEl('td');
            actionTd.style.border = "1px solid var(--background-modifier-border)";
            actionTd.style.textAlign = "center";
            const delBtn = actionTd.createEl('button', { text: '削除' });
            delBtn.onclick = () => {
                fm.members.splice(i, 1);
                this.saveData(fm, parsed.data, parsed.meta);
                this.renderUI();
            };
        });
    }

    renderPivotTable(container: HTMLElement, parsed: any, primaryKey: 'member' | 'theme', secondaryKey: 'member' | 'theme') {
        const fm = parsed.frontmatter as HRPlanFrontmatter;
        const months = fm.months;

        const table = container.createEl('table');
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.whiteSpace = "nowrap";

        const thead = table.createEl('thead');
        const trHead = thead.createEl('tr');
        const th1 = trHead.createEl('th', { text: primaryKey === 'member' ? 'メンバ' : 'テーマ' });
        const th2 = trHead.createEl('th', { text: secondaryKey === 'member' ? 'メンバ' : 'テーマ' });
        [th1, th2].forEach(th => {
            th.style.border = "1px solid var(--background-modifier-border)";
            th.style.background = "var(--background-secondary)";
            th.style.padding = "8px";
        });

        months.forEach(m => {
            const th = trHead.createEl('th', { text: m });
            th.style.border = "1px solid var(--background-modifier-border)";
            th.style.background = "var(--background-secondary)";
            th.style.padding = "8px";
        });

        const thTotal = trHead.createEl('th', { text: '合計' });
        thTotal.style.border = "1px solid var(--background-modifier-border)";
        thTotal.style.background = "var(--background-secondary)";
        thTotal.style.padding = "8px";

        const tbody = table.createEl('tbody');

        const primaryList = primaryKey === 'member' ? fm.members : fm.themes;
        const secondaryList = secondaryKey === 'member' ? fm.members : fm.themes;

        let grandTotals: Record<string, number> = {};
        months.forEach(m => grandTotals[m] = 0);

        primaryList.forEach(pItem => {
            const pName = pItem.name;
            let subTotals: Record<string, number> = {};
            months.forEach(m => subTotals[m] = 0);

            secondaryList.forEach((sItem, sIndex) => {
                const sName = sItem.name;
                const mName = primaryKey === 'member' ? pName : sName;
                const tName = primaryKey === 'theme' ? pName : sName;

                // dataから値を取得
                const rowData = parsed.data.find((r: any) => r["Member"] === mName && r["Theme"] === tName) || {};

                const tr = tbody.createEl('tr');
                const tdPri = tr.createEl('td', { text: sIndex === 0 ? pName : '' });
                const tdSec = tr.createEl('td', { text: sName });
                [tdPri, tdSec].forEach(td => {
                    td.style.border = "1px solid var(--background-modifier-border)";
                    td.style.padding = "4px 8px";
                });

                let rowSum = 0;
                months.forEach(month => {
                    const val = parseFloat(rowData[month]) || 0;
                    subTotals[month] = (subTotals[month] || 0) + val;
                    rowSum += val;

                    const td = tr.createEl('td', { text: val === 0 ? '' : Number(math.format(val, { precision: 14 })).toString() });
                    td.style.border = "1px solid var(--background-modifier-border)";
                    td.style.padding = "4px 8px";
                    td.style.textAlign = "right";
                    td.style.cursor = "text";
                    td.setAttribute('contenteditable', 'true');
                    td.onblur = (e) => {
                        const newVal = (e.target as HTMLElement).innerText.trim();
                        this.updateCellValue(fm, parsed.data, parsed.meta, mName, tName, month, newVal);
                    };
                    td.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLElement).blur();
                        }
                    };
                });

                // 行合計
                const tdRowTotal = tr.createEl('td', { text: rowSum === 0 ? '' : Number(math.format(rowSum, { precision: 14 })).toString() });
                tdRowTotal.style.border = "1px solid var(--background-modifier-border)";
                tdRowTotal.style.padding = "4px 8px";
                tdRowTotal.style.textAlign = "right";
                tdRowTotal.style.fontWeight = "bold";
                tdRowTotal.style.background = "var(--background-primary-alt)";
            });

            // 小計行
            const trSub = tbody.createEl('tr');
            const tdSub1 = trSub.createEl('td', { text: '' });
            const tdSub2 = trSub.createEl('td', { text: '小計' });
            [tdSub1, tdSub2].forEach(td => {
                td.style.border = "1px solid var(--background-modifier-border)";
                td.style.padding = "4px 8px";
                td.style.fontWeight = "bold";
                td.style.background = "var(--background-secondary)";
            });

            let subRowSum = 0;
            months.forEach(month => {
                const sTotal = subTotals[month] || 0;
                grandTotals[month] = (grandTotals[month] || 0) + sTotal;
                subRowSum += sTotal;

                const td = trSub.createEl('td', { text: sTotal === 0 ? '' : Number(math.format(sTotal, { precision: 14 })).toString() });
                td.style.border = "1px solid var(--background-modifier-border)";
                td.style.padding = "4px 8px";
                td.style.textAlign = "right";
                td.style.fontWeight = "bold";
                td.style.background = "var(--background-secondary)";

                // 1.0 (MM) を超えている場合のハイライト (メンバ別の小計の場合のみ)
                if (primaryKey === 'member' && sTotal > 1.0) {
                    td.style.color = "var(--text-error)";
                } else if (primaryKey === 'member' && sTotal < 0.5 && sTotal !== 0) {
                    td.style.color = "var(--text-accent)"; // 暇な場合など
                }
            });
            const tdSubTotal = trSub.createEl('td', { text: subRowSum === 0 ? '' : Number(math.format(subRowSum, { precision: 14 })).toString() });
            tdSubTotal.style.border = "1px solid var(--background-modifier-border)";
            tdSubTotal.style.padding = "4px 8px";
            tdSubTotal.style.textAlign = "right";
            tdSubTotal.style.fontWeight = "bold";
            tdSubTotal.style.background = "var(--background-secondary)";
        });

        // 総合計行
        const tfoot = table.createEl('tfoot');
        const trGrand = tfoot.createEl('tr');
        const tdGrand1 = trGrand.createEl('td', { text: '' });
        const tdGrand2 = trGrand.createEl('td', { text: '合計' });
        [tdGrand1, tdGrand2].forEach(td => {
            td.style.border = "1px solid var(--background-modifier-border)";
            td.style.padding = "8px";
            td.style.fontWeight = "bold";
            td.style.background = "var(--background-modifier-error)";
            td.style.color = "white";
        });

        let grandRowSum = 0;
        months.forEach(month => {
            const gTotal = grandTotals[month] || 0;
            grandRowSum += gTotal;
            const td = trGrand.createEl('td', { text: gTotal === 0 ? '' : Number(math.format(gTotal, { precision: 14 })).toString() });
            td.style.border = "1px solid var(--background-modifier-border)";
            td.style.padding = "8px";
            td.style.textAlign = "right";
            td.style.fontWeight = "bold";
            td.style.background = "var(--background-modifier-error)";
            td.style.color = "white";
        });
        const tdGrandTotal = trGrand.createEl('td', { text: grandRowSum === 0 ? '' : Number(math.format(grandRowSum, { precision: 14 })).toString() });
        tdGrandTotal.style.border = "1px solid var(--background-modifier-border)";
        tdGrandTotal.style.padding = "8px";
        tdGrandTotal.style.textAlign = "right";
        tdGrandTotal.style.fontWeight = "bold";
        tdGrandTotal.style.background = "var(--background-modifier-error)";
        tdGrandTotal.style.color = "white";
    }
}