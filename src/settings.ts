import { App, PluginSettingTab, Setting } from "obsidian";
import HRPlanPlugin from "./main";

export interface HRPlanSettings {
	dummySetting: string;
}

export const DEFAULT_SETTINGS: HRPlanSettings = {
	dummySetting: 'default'
}

export class HRPlanSettingTab extends PluginSettingTab {
	plugin: HRPlanPlugin;

	constructor(app: App, plugin: HRPlanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'HRPlan Settings' });
		containerEl.createEl('p', { text: 'There are no settings available yet.' });
	}
}
