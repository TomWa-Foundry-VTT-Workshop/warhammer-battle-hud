/**
 * TomWa Warhammer HUD
 * Ramki drużyny, pasek akcji i amunicji oraz szybkie testy dla systemów Warhammera.
 */

import { MODULE_ID, log } from "./bar/constants.mjs";
import { registerSettings as registerBarSettings, getSetting } from "./bar/settings.mjs";
import { adapterFor as ammoFor } from "./bar/systems/index.mjs";
import { BattleBar } from "./bar/battle-bar.mjs";
import { counterFor } from "./bar/counters.mjs";
import { handsFor } from "./bar/hands.mjs";
import { applyTheme } from "./bar/theme.mjs";
import { t } from "./bar/constants.mjs";
import { registerSettings as registerFrameSettings, getSetting as getFrameSetting, toggleFrames } from "./frames/settings.mjs";
import { adapterFor as framesFor } from "./frames/systems.mjs";
import { PartyFrames } from "./frames/party-frames.mjs";
import { wfrpActions } from "./actions/wfrp4e.mjs";
import { registerAdvantageActions } from "./actions/custom-advantage.mjs";
import { CustomizeHud } from "./customize/customize-hud.mjs";
import { towActions } from "./actions/tow.mjs";
import { imActions } from "./actions/im.mjs";
import { wngActions } from "./actions/wng.mjs";
import { sbActions } from "./actions/sb.mjs";
import { testsFor } from "./tests/index.mjs";
import { testActions } from "./tests/actions.mjs";
import { registerTokenTests } from "./tests/token-tests.mjs";

const refreshBar = foundry.utils.debounce(() => BattleBar.refresh(), 100);
const refreshFrames = foundry.utils.debounce(() => PartyFrames.refresh(), 100);

let supported = false;

Hooks.once("init", () => {
  const frames = framesFor(game.system.id);
  if (!frames) return log.info(`system ${game.system.id} nie jest obsługiwany`);
  supported = true;
  // Kolory HUD-a i ramek dopasowane do kart postaci systemu (styles: body.whb-system-<id>)
  document.body.classList.add(`whb-system-${game.system.id}`);
  PartyFrames.adapter = frames;
  BattleBar.adapter = ammoFor(game.system.id);
  registerFrameSettings(refreshFrames);
  registerBarSettings(Boolean(BattleBar.adapter), refreshBar, Boolean(counterFor(game.system.id)), Boolean(handsFor(game.system.id)));
  // Własne akcje za Przewagę (WFRP4e) i okno „Dostosuj HUD” w ustawieniach modułu
  registerAdvantageActions(game.settings, { systemId: game.system.id, menuType: CustomizeHud, onChange: refreshBar });
  // Wariant kolorystyki wybrany przez gracza (albo domyślny dla systemu)
  applyTheme();
  // Zasoby spoza aktora (np. Przewaga Taktyczna w ustawieniach świata) odświeżają licznik własnym hookiem
  for (const hook of counterFor(game.system.id)?.hooks ?? []) Hooks.on(hook, () => refreshBar());
  game.modules.get(MODULE_ID).api = {
    refresh: () => {
      BattleBar.refresh();
      PartyFrames.refresh();
    },
    /** Przywraca HUD na domyślne miejsce nad paskiem makr. */
    resetPosition: () => BattleBar.resetPosition()
  };
});

Hooks.once("ready", async () => {
  if (!supported) return;
  const tests = testsFor(game.system.id);
  const catalog = tests ? await tests.catalog(game, []) : [];
  // Systemy z własnym panelem akcji; pozostałe dostają zakładkę testów
  const panels = { wfrp4e: wfrpActions, whtow: towActions, impmal: imActions, "wrath-and-glory": wngActions, "age-of-sigmar-soulbound": sbActions };
  BattleBar.actions = panels[game.system.id]?.(getSetting) ?? (tests ? testActions(tests, catalog) : null);
  if (tests && getSetting("showTokenTests")) registerTokenTests(tests, catalog);
  BattleBar.refresh();
  PartyFrames.refresh();

  // Wszystko, co zmienia zawartość ramek
  for (const hook of [
    "updateActor", "createActor", "deleteActor", "updateUser", "userConnected",
    "createActiveEffect", "updateActiveEffect", "deleteActiveEffect", "createItem", "deleteItem",
    "controlToken", "targetToken", "createToken", "deleteToken", "canvasReady",
    "createCombat", "updateCombat", "deleteCombat", "createCombatant", "deleteCombatant"
  ]) Hooks.on(hook, refreshFrames);
});

/** Czy dokument należy do postaci pokazywanej na pasku. */
const shown = (actor) => actor && BattleBar.actor?.uuid === actor.uuid;

for (const hook of ["controlToken", "updateUser"]) Hooks.on(hook, () => supported && refreshBar());
for (const hook of ["createItem", "deleteItem"]) Hooks.on(hook, (item) => supported && shown(item.actor) && refreshBar());
for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(hook, (effect) => supported && shown(effect.parent) && refreshBar());
Hooks.on("updateActor", (actor) => supported && shown(actor) && refreshBar());

Hooks.on("updateItem", (item, changes, _options, userId) => {
  if (!supported || !shown(item.actor)) return;
  refreshBar();
  // Ostrzeżenie dla osoby, która zużyła ostatnią sztukę
  const next = BattleBar.adapter && foundry.utils.getProperty(changes, BattleBar.adapter.quantityPath);
  if (next === 0 && userId === game.user.id) ui.notifications.warn(t("Empty", { name: item.name }));
});

/** Przełącznik ramek drużyny w narzędziach tokenów – stąd wraca się do ukrytych ramek. */
Hooks.on("getSceneControlButtons", (controls) => {
  if (!supported) return;
  const tools = (controls?.tokens ?? controls?.token)?.tools;
  if (!tools || tools[`${MODULE_ID}-frames`]) return;
  tools[`${MODULE_ID}-frames`] = {
    name: `${MODULE_ID}-frames`,
    title: game.i18n.localize("WHFRAMES.Toggle"),
    icon: "fa-solid fa-users-rectangle",
    order: Object.keys(tools).length,
    toggle: true,
    active: getFrameSetting("showFrames"),
    onChange: (_event, active) => toggleFrames(active)
  };
});
