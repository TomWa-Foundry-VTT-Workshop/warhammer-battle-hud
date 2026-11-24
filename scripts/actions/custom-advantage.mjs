/**
 * Własne akcje za Przewagę (WFRP 4e) definiowane przez MG w oknie „Dostosuj HUD” – bez zależności od Foundry.
 *
 * Wpis ustawienia: { id, name, cost, description, macro }. Makro to id makra świata; HUD uruchamia je
 * u gracza, który kliknął, i tylko wtedy, gdy żaden gracz nie może go edytować.
 */
import { MODULE_ID } from "./constants.mjs";
import { escapeHtml } from "./tooltip.mjs";

/** Najwięcej akcji, najdłuższa nazwa i opis oraz najwyższy koszt. */
export const ADVANTAGE_LIMITS = Object.freeze({ actions: 20, name: 60, description: 500, cost: 10 });

const ADVANTAGE_PATH = "system.status.advantage.value";

/** Bieżąca Przewaga aktora (0, gdy jej nie ma). */
export const currentAdvantage = (actor) => Number(actor?.system?.status?.advantage?.value) || 0;

/** Identyfikator dokumentu Foundry: 16 liter i cyfr. */
const DOCUMENT_ID = /^[A-Za-z0-9]{16}$/;

const isDocumentId = (value) => typeof value === "string" && DOCUMENT_ID.test(value);

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** Koszt jako liczba całkowita 0–10 albo `null`, gdy wartość nie jest poprawnym kosztem. */
function parseCost(value) {
  let number;
  if (typeof value === "number") number = value;
  else if (typeof value === "string" && value.trim()) number = Number(value);
  else return null;
  return Number.isInteger(number) && number >= 0 && number <= ADVANTAGE_LIMITS.cost ? number : null;
}

/**
 * Poprawne wpisy z surowej wartości ustawienia albo formularza, najwyżej 20, w kolejności wejścia.
 * Wpis bez poprawnego id, nazwy albo kosztu oraz wpis z id, które już wystąpiło, zostaje odrzucony.
 * @param {unknown} raw
 * @returns {{id: string, name: string, cost: number, description: string, macro: string}[]}
 */
export function normalizeAdvantageActions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    if (result.length >= ADVANTAGE_LIMITS.actions) break;
    if (!isPlainObject(item) || !isDocumentId(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    const name = String(item.name ?? "").trim().slice(0, ADVANTAGE_LIMITS.name);
    const cost = parseCost(item.cost);
    if (!name || cost === null) continue;
    result.push({
      id: item.id,
      name,
      cost,
      description: String(item.description ?? "").trim().slice(0, ADVANTAGE_LIMITS.description),
      macro: isDocumentId(item.macro) ? item.macro : ""
    });
  }
  return result;
}

/** Makro jest zaufane, gdy żaden użytkownik bez roli MG nie ma do niego uprawnienia właściciela. */
export function macroTrusted(macro, users) {
  return !users.some((u) => !u.isGM && macro.testUserPermission(u, "OWNER"));
}

/** Czy któryś użytkownik bez roli MG może uruchomić makro. */
export function playersCanRun(macro, users) {
  return users.some((u) => !u.isGM && macro.canUserExecute(u));
}

/** Treść karty czatu: escapowana nazwa i opis, bez dwukropka przy pustym opisie. */
export function customAdvantageChatHtml(entry) {
  const name = `<strong>${escapeHtml(entry.name)}</strong>`;
  return entry.description ? `<p>${name}: ${escapeHtml(entry.description)}</p>` : `<p>${name}</p>`;
}

/**
 * Odejmuje koszt od Przewagi aktora: przez `actor.spend` (wspólna Przewaga systemu), a bez niego zapisem wartości.
 * @returns {Promise<boolean>} `false`, gdy Przewagi jest za mało albo system odmówił wydatku
 */
export async function spendAdvantage(actor, cost) {
  if (cost === 0) return true;
  const current = currentAdvantage(actor);
  if (current < cost) return false;
  if (typeof actor.spend === "function") return Boolean(await actor.spend(ADVANTAGE_PATH, cost));
  await actor.update({ [ADVANTAGE_PATH]: current - cost });
  return true;
}

/** Aktorzy, dla których trwa kliknięcie własnej akcji (klucz: uuid albo id). */
const pending = new Set();

/**
 * Kliknięcie własnej akcji: sprawdzenie postaci, wpisu i makra, wydatek, karta czatu i makro.
 * Każda odmowa kończy się wynikiem `false` przed wydatkiem.
 * @param {object} actor
 * @param {{id: string}} action  zdekodowana wartość przycisku
 * @param {{
 *   entries: () => unknown,
 *   getMacro: (id: string) => object|undefined,
 *   trusted: (macro: object) => boolean,
 *   warn: (key: string, data?: object) => void,
 *   postChat: (actor: object, entry: object) => Promise<unknown>,
 *   context: (actor: object) => {token: object|null, speaker: object}
 * }} deps
 * @returns {Promise<boolean>}
 */
export async function useCustomAdvantage(actor, action, deps) {
  const key = actor.uuid ?? actor.id;
  if (pending.has(key)) return false;
  pending.add(key);
  const refuse = (...warning) => {
    deps.warn(...warning);
    return false;
  };
  try {
    if (actor.isOwner !== true) return refuse("NotOwner");
    const entry = normalizeAdvantageActions(deps.entries()).find((e) => e.id === action.id);
    if (!entry) return refuse("CustomMissing");
    const macro = entry.macro ? deps.getMacro(entry.macro) : null;
    if (entry.macro) {
      if (!macro) return refuse("MacroMissing");
      if (deps.trusted(macro) !== true) return refuse("MacroUntrusted");
      if (macro.canExecute !== true) return refuse("MacroNoAccess");
    }
    const current = currentAdvantage(actor);
    if (!(await spendAdvantage(actor, entry.cost))) return refuse("NotEnoughAdvantage", { cost: entry.cost, current });
    await deps.postChat(actor, entry);
    if (macro) await macro.execute({ ...deps.context(actor), actor, advantageAction: { id: entry.id, name: entry.name, cost: entry.cost } });
    return true;
  } finally {
    pending.delete(key);
  }
}

/**
 * Ustawienie świata z akcjami i przycisk okna „Dostosuj HUD” w ustawieniach modułu – tylko w WFRP4e.
 * @returns {boolean} czy coś zarejestrowano
 */
export function registerAdvantageActions(settings, { systemId, menuType, onChange }) {
  if (systemId !== "wfrp4e") return false;
  settings.register(MODULE_ID, "advantageActions", { scope: "world", config: false, type: Array, default: [], onChange });
  settings.registerMenu(MODULE_ID, "customize", {
    name: "WFRP4E_HUD.Customize.MenuName",
    label: "WFRP4E_HUD.Customize.MenuLabel",
    hint: "WFRP4E_HUD.Customize.MenuHint",
    icon: "fa-solid fa-sliders",
    type: menuType,
    restricted: true
  });
  return true;
}
