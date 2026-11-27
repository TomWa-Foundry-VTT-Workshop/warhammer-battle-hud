/**
 * Panel akcji Age of Sigmar: Soulbound – zakładki z sb-builders.mjs, wykonanie przez API systemu
 * (te same metody, których używa karta postaci).
 */
import * as B from "./sb-builders.mjs";
import { finishPanel, groupBySchool, systemActions, testContext } from "./system-panel.mjs";

const SB = B.SB;
const ITEM_BACKED = new Set([SB.weapon, SB.armour, SB.spell, SB.miracle, SB.equip]);

const env = () => ({ config: game.aos?.config ?? {}, localize: (key) => game.i18n.localize(key), statusEffects: CONFIG.statusEffects, onlyEquipped: game.settings.get("warhammer-battle-hud", "actionsOnlyEquipped") });
const label = (key) => game.i18n.localize(`WHB_SB.${key}`);
const group = (key, actions) => ({ label: label(`Groups.${key}`), actions });

export function sbPanel(actor, e = env()) {
  const combat = B.buildCombat(actor, e);
  const powers = B.buildPowers(actor, e);
  return finishPanel([
    { id: "combat", groups: [group("Melee", combat.melee), group("Ranged", combat.ranged), group("Combat", combat.other), group("Armour", combat.armour), group("Equipment", B.buildEquipment(actor, e))] },
    { id: "skills", columns: 4, groups: [group("Attributes", B.buildAttributes(actor, e)), ...B.buildSkillGroups(actor, e)] },
    { id: "powers", columns: "auto", groups: [...groupBySchool(powers.spells, { labelOf: (key) => key, otherLabel: label("Groups.Spells") }), group("Miracles", powers.miracles)] },
    { id: "talents", groups: [group("Talents", B.buildTalents(actor, e))] },
    // „Stan” jak w pozostałych systemach
    { id: "status", groups: [group("Conditions", B.buildConditions(actor, e))] }
  ], label);
}

async function perform(actor, { type, id }, mods, settings) {
  if (mods.right && ITEM_BACKED.has(type)) return actor.items.get(id)?.sheet?.render({ force: true });
  if (mods.right && type === SB.ability) return (await fromUuid(id))?.sheet?.render({ force: true });
  const context = testContext(mods, settings);
  const system = actor.system;
  switch (type) {
    case SB.attribute: return system.setupCommonTest({ attribute: id }, context);
    case SB.skill: return system.setupCommonTest({ skill: id }, context);
    case SB.weapon: return system.setupCombatTest(id, context);
    case SB.spell: return system.setupSpellTest(id, context);
    case SB.miracle: return system.setupMiracleTest(id, context);
    case SB.ability: return system.setupAbilityUse(id, context);
    case SB.initiative: return actor.rollInitiative({ createCombatants: true });
    case SB.equip: {
      const item = actor.items.get(id);
      return item?.update({ "system.equipped": !item.system.equipped });
    }
    case SB.armour: return actor.items.get(id)?.sheet?.render({ force: true });
    case SB.condition:
      if (mods.right || actor.hasCondition(id)) return actor.removeCondition(id);
      return actor.addCondition(id);
    case SB.mettle: {
      const { value = 0, max = 0 } = system.combat?.mettle ?? {};
      return actor.update({ "system.combat.mettle.value": Math.max(0, Math.min(max, value + (mods.right ? -1 : 1))) });
    }
  }
}

export const sbActions = (getSetting) => systemActions(getSetting, { panel: sbPanel, types: SB, perform, name: "Soulbound" });
