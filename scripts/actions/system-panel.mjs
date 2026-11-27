/**
 * Wspólny szkielet paneli akcji systemów z własnymi budowniczymi (The Old World, Imperium Maledictum,
 * Wrath & Glory, Soulbound): zakładki → grupy → akcje z podpowiedzią, wartość przycisku "typ|id|dodatek".
 */
import { tooltipHtml } from "./tooltip.mjs";
import { t, log } from "./constants.mjs";

/** Wartość przycisku i jej odczyt (UUID i klucze nie zawierają „|”). */
export const panelValue = (type, id = "", extra = "") => [type, id, extra].join("|").replace(/\|+$/, "");
export function readPanelValue(value, types) {
  const [type, id = "", extra = ""] = String(value ?? "").split("|");
  return Object.values(types).includes(type) ? { type, id, extra } : null;
}

/**
 * Kolumny magii według szkoły (tradycji, dyscypliny): kolejność z konfiguracji systemu, potem pozostałe
 * alfabetycznie, a bez szkoły na końcu. Używane we wszystkich systemach.
 */
export function groupBySchool(actions, { labelOf, order = [], otherLabel }) {
  const groups = new Map();
  for (const action of actions) {
    const key = String(action.school ?? "").trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(action);
  }
  const rank = (key) => (key === "" ? Number.MAX_SAFE_INTEGER : order.includes(key) ? order.indexOf(key) : order.length);
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, list]) => ({ label: key ? labelOf(key) : otherLabel, actions: list }));
}

/** Liczba kolumn dla zakładki z `columns: "auto"`: tyle, ile grup, najwyżej cztery. */
export const autoColumns = (columns, groups) => (columns === "auto" ? Math.min(4, Math.max(1, groups)) : columns);

/** Zakładki do pokazania: puste grupy i zakładki znikają, każda akcja dostaje gotową podpowiedź HTML. */
export function finishPanel(tabs, label) {
  const view = (action) => ({
    name: action.name,
    img: action.img,
    value: action.value,
    detail: action.detail ?? "",
    cssClass: action.cssClass ?? "",
    tooltip: tooltipHtml({ name: action.name, ...action.tooltip })
  });
  return tabs
    .map((tab) => {
      const groups = tab.groups.filter((g) => g.actions.length).map((g) => ({ ...g, actions: g.actions.map(view) }));
      return { id: tab.id, columns: autoColumns(tab.columns, groups.length), label: label(`Tabs.${tab.id}`), groups };
    })
    .filter((tab) => tab.groups.length);
}

/** Okno rzutu: Alt pomija je (albo pokazuje, gdy pomijanie jest domyślne), Shift daje tajny rzut MG. */
export function testContext(mods, settings) {
  const context = { skipDialog: Boolean(mods.alt) !== Boolean(settings.skipDialogByDefault) };
  if (mods.shift && settings.blindOnShift) context.fields = { rollMode: "blindroll" };
  return context;
}

/**
 * Obiekt panelu dla BattleBar: { tabs, groups, perform }.
 * @param {(actor) => Array} panel  zakładki z finishPanel
 * @param {object} types            typy akcji systemu
 * @param {(actor, action, mods, settings) => Promise} perform
 * @param {string} name             nazwa systemu do logów
 */
export function systemActions(getSetting, { panel, types, perform, name }) {
  const settings = () => ({ blindOnShift: getSetting("blindOnShift"), skipDialogByDefault: getSetting("skipDialogByDefault") });
  return {
    tabs: (actor) => panel(actor).map(({ id, label, columns }) => ({ id, label, columns })),
    groups: (actor, tabId) => panel(actor).find((tab) => tab.id === tabId)?.groups ?? [],
    async perform(actor, value, mods) {
      const action = readPanelValue(value, types);
      if (!action) return;
      try {
        await perform(actor, action, mods, settings());
      } catch (err) {
        log.error(`${name}: ${value}`, err);
        // Systemy zgłaszają zasady zwykłym Error („Not enough Mettle!”) – jego treść jest dla gracza; błędy kodu (TypeError…) nie
        const rule = typeof err === "string" ? err : err?.constructor === Error ? err.message : "";
        ui.notifications.error(rule || t("Notify.ActionFailed"));
      }
    }
  };
}

/**
 * Jedna reguła dla wszystkich systemów: postać gracza (typy z `pcTypes`) przy włączonym ustawieniu
 * „tylko założone” pokazuje do walki wyłącznie założoną broń i pancerz; BN-y i stwory – wszystko.
 */
export function gearForUse(actor, list, isEquipped, { onlyEquipped = true, pcTypes = ["character"] } = {}) {
  if (!onlyEquipped || !pcTypes.includes(actor?.type)) return [...list];
  return list.filter((item) => isEquipped(item));
}

/**
 * Grupa Ekwipunek (ostatnia w zakładce Walka, w każdym systemie): każda broń, pancerz i tarcza jako
 * przełącznik – klik zakłada albo odkłada, prawy klik otwiera przedmiot.
 * @param {Array} list                     przedmioty do pokazania
 * @param {object} options
 * @param {(item) => boolean} options.isEquipped
 * @param {(item) => string} options.value      wartość przycisku
 * @param {(item) => string} [options.detail]   krótka wartość przy nazwie (obrażenia, pancerz)
 * @param {(item) => Array} [options.details]   wiersze podpowiedzi
 * @param {string} options.hint
 */
export function equipmentActions(list, { isEquipped, value, detail = () => "", details = () => [], hint }) {
  return list.map((item) => ({
    name: item.name,
    img: item.img,
    value: value(item),
    detail: String(detail(item) ?? ""),
    cssClass: isEquipped(item) ? "toggle active" : "toggle",
    tooltip: { details: details(item), hint }
  }));
}
