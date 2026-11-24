/**
 * Okno „Dostosuj HUD” w ustawieniach modułu (dla MG). Każda sekcja to osobna część okna;
 * sekcja „Akcje za Przewagę” edytuje ustawienie świata `advantageActions`.
 * Ustawienie zapisuje tylko przycisk „Zapisz”; „Dodaj akcję” i „Usuń” zmieniają wiersze w oknie.
 */
import { MODULE_ID, t } from "../actions/constants.mjs";
import { getSetting, setSetting } from "../bar/settings.mjs";
import { ADVANTAGE_LIMITS, macroTrusted, normalizeAdvantageActions, playersCanRun } from "../actions/custom-advantage.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Wiersze akcji z danych formularza (pola `actions.<n>.<pole>`), w kolejności. */
const rowsOf = (formData) => Object.values(foundry.utils.expandObject(formData.object).actions ?? {});

/** Zaufane makra świata posortowane po nazwie, z dopiskiem, gdy gracze nie mogą ich uruchomić. */
function trustedMacroOptions() {
  const users = game.users.contents;
  return game.macros.contents
    .filter((macro) => macroTrusted(macro, users))
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
    .map((macro) => ({ value: macro.id, label: playersCanRun(macro, users) ? macro.name : `${macro.name} (${t("Customize.NoAccess")})` }));
}

/** Opcje makra wiersza: „Bez makra”, zaufane makra i zapisane makro spoza tej listy. */
function macroOptions(selected, trusted) {
  const options = [{ value: "", label: t("Customize.NoMacro") }, ...trusted];
  if (selected && !options.some((option) => option.value === selected)) {
    const macro = game.macros.get(selected);
    options.push({ value: selected, label: macro ? `${macro.name} (${t("Customize.MacroUntrusted")})` : t("Customize.MacroGone") });
  }
  return options.map((option) => ({ ...option, selected: option.value === selected }));
}

export class CustomizeHud extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Wiersze akcji za Przewagę widoczne w oknie, z wartościami jeszcze niezapisanymi. */
  #rows = null;

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-customize`,
    tag: "form",
    classes: [MODULE_ID, "whb-customize"],
    window: { title: "WFRP4E_HUD.Customize.Title", icon: "fa-solid fa-sliders", resizable: true },
    position: { width: 640 },
    form: { handler: CustomizeHud.#onSubmit, closeOnSubmit: true },
    actions: {
      addAction: CustomizeHud.#onAddAction,
      deleteAction: CustomizeHud.#onDeleteAction
    }
  };

  static PARTS = {
    advantageActions: { template: `modules/${MODULE_ID}/templates/customize-hud.hbs` },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId === "advantageActions") {
      this.#rows ??= normalizeAdvantageActions(getSetting("advantageActions"));
      const trusted = trustedMacroOptions();
      context.rows = this.#rows.map((row) => ({ ...row, macroOptions: macroOptions(row.macro, trusted) }));
      context.limits = ADVANTAGE_LIMITS;
      context.full = this.#rows.length >= ADVANTAGE_LIMITS.actions;
      context.limitText = t("Customize.Limit", { max: ADVANTAGE_LIMITS.actions });
    }
    if (partId === "footer") context.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "WFRP4E_HUD.Customize.Save" }];
    return context;
  }

  /** Wiersze z bieżących wartości formularza. */
  #formRows() {
    return rowsOf(new foundry.applications.ux.FormDataExtended(this.element));
  }

  static async #onAddAction() {
    this.#rows = this.#formRows();
    if (this.#rows.length >= ADVANTAGE_LIMITS.actions) return;
    this.#rows.push({ id: foundry.utils.randomID(), name: "", cost: 1, description: "", macro: "" });
    return this.render();
  }

  static async #onDeleteAction(_event, target) {
    this.#rows = this.#formRows().filter((row) => row.id !== target.dataset.id);
    return this.render();
  }

  static async #onSubmit(_event, _form, formData) {
    const rows = rowsOf(formData);
    const list = normalizeAdvantageActions(rows);
    if (list.length !== rows.length) throw new Error(t("Customize.Invalid"));
    await setSetting("advantageActions", list);
  }
}
