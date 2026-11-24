/**
 * Panel akcji WFRP4e: zakładki z budowniczych akcji, kliknięcie wykonuje akcję przez API systemu.
 */
import * as B from "./builders.mjs";
import { decodeAction } from "./encoding.mjs";
import { getEdition } from "./edition.mjs";
import { resolveIntent } from "./intent.mjs";
import { GROUPS, LAYOUT } from "./layout.mjs";
import { performAction } from "./wfrp-actions.mjs";
import { tooltipHtml } from "./tooltip.mjs";
import { ACTION_TYPES as T } from "./encoding.mjs";
import { hasSetting } from "../bar/settings.mjs";

const G = B.GROUP_IDS;
const FULL_ACTORS = ["character", "npc", "creature"];

/** Efekty aktora i jego przedmiotów (do ręcznych skryptów). */
const collectEffects = (actor) => [...(actor.effects ?? []), ...[...(actor.items ?? [])].flatMap((item) => [...(item.effects ?? [])])];

/** Akcje postaci według grup. Pojazdy mają tylko stany. */
export function actionsByGroup(actor, env) {
  if (!FULL_ACTORS.includes(actor.type)) return { [G.conditions]: B.buildConditions(actor, env) };
  const weapons = B.buildWeapons(actor, env);
  const spells = B.buildSpells(actor, env);
  const prayers = B.buildPrayers(actor, env);
  return {
    [G.characteristics]: B.buildCharacteristics(actor, env),
    [G.weaponsMelee]: weapons.melee,
    [G.weaponsRanged]: weapons.ranged,
    [G.armour]: B.buildArmour(actor, env),
    [G.traits]: B.buildTraits(actor, env),
    [G.petty]: spells.petty,
    [G.spells]: spells.spells,
    [G.channelling]: spells.channelling,
    [G.blessings]: prayers.blessings,
    [G.miracles]: prayers.miracles,
    [G.talents]: B.buildTalents(actor, env),
    [G.extended]: B.buildExtendedTests(actor, env),
    [G.effects]: B.buildManualEffects(collectEffects(actor)),
    [G.conditions]: B.buildConditions(actor, env),
    [G.advantage]: B.buildAdvantage(actor, env),
    [G.advantageActions]: [...B.buildAdvantageActions(actor, env), ...B.buildCustomAdvantageActions(actor, env)],
    [G.downtime]: B.buildDowntime(actor, env),
    [G.channelledReset]: B.buildChannelledReset(actor, env),
    [G.gangOrders]: env.edition === "5e" ? [] : B.buildGangOrders(actor, env),
    // 5e: bez zakładki Przewaga rozkazy szajki trafiają do Walki
    [G.gangOrdersCombat]: env.edition === "5e" ? B.buildGangOrders(actor, env) : [],
    [G.equipment]: B.buildEquipment(actor, env)
  };
}

/** Ściąga sterowania w podpowiedzi, według typu akcji (klucze WFRP4E_HUD.Hint.*). */
const HINTS = {
  [T.characteristic]: "Roll",
  [T.skill]: "RollItem",
  [T.spell]: "RollItem",
  [T.channel]: "RollItem",
  [T.channelWind]: "Roll",
  [T.prayer]: "RollItem",
  [T.trait]: "RollItem",
  [T.extended]: "RollItem",
  [T.weapon]: "Weapon",
  [T.armour]: "Armour",
  [T.talent]: "Post",
  [T.item]: "Post",
  [T.effect]: "Effect",
  [T.condition]: "Counter",
  [T.advantage]: "Counter",
  [T.advantageAction]: "AdvantageAction",
  [T.customAdvantage]: "AdvantageAction",
  [T.gangOrder]: "GangOrder",
  [T.income]: "Income",
  [T.careerCheck]: "CareerCheck",
  [T.equip]: "Equip",
  [T.rest]: "Rest",
  [T.endeavour]: "Endeavour",
  [T.channelReset]: "ChannelReset"
};

function hintFor(action, env) {
  const key = HINTS[decodeAction(action.encodedValue)?.type];
  return key ? env.localize(`WFRP4E_HUD.Hint.${key}`) : "";
}

/** Zakładki z co najmniej jedną akcją, z grupami do pokazania. */
export function buildPanel(actor, env) {
  const byGroup = actionsByGroup(actor, env);
  const view = (action) => ({
    name: action.name,
    img: action.img,
    value: action.encodedValue,
    detail: action.info1?.text ?? "",
    tooltip: tooltipHtml({
      name: action.name,
      details: action.details,
      text: action.tooltip,
      hint: hintFor(action, env)
    }),
    cssClass: action.cssClass ?? ""
  });
  // Umiejętności w kolumnach według cech: grupy zależą od postaci, nie od stałego układu
  const dynamic = { skills: () => (FULL_ACTORS.includes(actor.type) ? B.buildSkillGroups(actor, env) : []) };
  return LAYOUT.filter((tab) => !tab.edition || tab.edition === (env.edition ?? "4e")).map((tab) => ({
    id: tab.id,
    label: env.localize(tab.name),
    columns: tab.columns,
    groups: tab.dynamic
      ? dynamic[tab.dynamic]().map((group) => ({ label: group.label, actions: group.actions.map(view) }))
      : tab.groups
        .filter((id) => byGroup[id]?.length)
        .map((id) => ({ label: env.localize(GROUPS[id]), actions: byGroup[id].map(view) }))
  })).filter((tab) => tab.groups.length);
}

export function wfrpActions(getSetting) {
  const settings = () => ({
    onlyEquipped: getSetting("actionsOnlyEquipped"),
    showUnrollableTraits: getSetting("showUnrollableTraits"),
    blindOnShift: getSetting("blindOnShift"),
    skipDialogByDefault: getSetting("skipDialogByDefault")
  });
  const env = () => ({
    config: game.wfrp4e?.config ?? {},
    localize: (key) => game.i18n.localize(key),
    edition: getEdition(),
    isGM: game.user.isGM,
    settings: settings(),
    // Przedsięwzięcia: strony dziennika świata z flagą systemu (np. z dodatków z zasadami 5e)
    endeavours: game.journal.contents.flatMap((j) => j.pages.contents).filter((p) => p.getFlag("wfrp4e", "endeavour") && p.testUserPermission(game.user, "OBSERVER")),
    // Rozkazy szajki z Underworld (starsze wersje modułu nie mają tego API)
    gangOrders: (actor) => (typeof game.underworld?.tacticalOrders === "function" ? game.underworld.tacticalOrders(actor) : []),
    conditionValue: (actor, key) => {
      const effect = actor.hasCondition?.(key);
      return effect ? (effect.conditionValue ?? 1) : 0;
    },
    customAdvantageActions: hasSetting("advantageActions") ? getSetting("advantageActions") : []
  });
  const panel = (actor) => buildPanel(actor, env());
  return {
    tabs: (actor) => panel(actor).map(({ id, label, columns }) => ({ id, label, columns })),
    groups: (actor, tabId) => panel(actor).find((tab) => tab.id === tabId)?.groups ?? [],
    async perform(actor, value, mods) {
      const action = decodeAction(value);
      if (!action) return;
      const intent = resolveIntent(action.type, mods, settings());
      if (intent.intent !== "none") await performAction(actor, action, intent);
    }
  };
}
