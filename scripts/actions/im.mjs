/**
 * Panel akcji Imperium Maledictum – zakładki z im-builders.mjs, wykonanie przez API systemu impmal
 * (te same metody, których używa karta postaci).
 */
import * as B from "./im-builders.mjs";
import { finishPanel, groupBySchool, systemActions, testContext } from "./system-panel.mjs";
import { t } from "./constants.mjs";

const IM = B.IM;

/** Typy, które prawym klikiem otwierają kartę przedmiotu. */
const ITEM_BACKED = new Set([IM.weapon, IM.trait, IM.protection, IM.power, IM.use, IM.sheet, IM.reload, IM.equip]);

const env = () => ({
  onlyEquipped: game.settings.get("warhammer-battle-hud", "actionsOnlyEquipped"),
  config: game.impmal?.config ?? {},
  localize: (key) => game.i18n.localize(key),
  statusEffects: CONFIG.statusEffects
});

const label = (key) => game.i18n.localize(`WHB_IM.${key}`);
const group = (key, actions) => ({ label: label(`Groups.${key}`), actions });

/** Zakładki z grupami; puste grupy i zakładki znikają. */
export function imPanel(actor, e = env()) {
  const combat = B.buildCombat(actor, e);
  const psychic = B.buildPsychic(actor, e);
  const talents = B.buildTalents(actor, e);
  const status = B.buildStatus(actor, e);
  const tabs = [
    { id: "combat", groups: [group("Actions", B.buildActions(e)), group("Melee", combat.melee), group("Ranged", combat.ranged), group("Reload", combat.reload), group("Defence", combat.defence), group("Traits", combat.traits), group("Protection", combat.protection), group("Equipment", B.buildEquipment(actor, e))] },
    { id: "characteristics", groups: [group("Characteristics", B.buildCharacteristics(actor, e))] },
    { id: "skills", columns: 4, groups: B.buildSkillGroups(actor, e) },
    {
      id: "psychic",
      columns: "auto",
      groups: [
        ...groupBySchool(psychic.powers, {
          order: Object.keys(e.config?.disciplines ?? {}),
          labelOf: (key) => (e.config?.disciplines?.[key] ? e.localize(e.config.disciplines[key]) : key),
          otherLabel: label("Groups.Powers")
        }),
        group("Warp", psychic.warp)
      ]
    },
    { id: "talents", groups: [group("Talents", talents.talents), group("Traits", talents.traits), group("Corruption", talents.corruption)] },
    { id: "status", groups: [group("Fate", status.fate), group("Conditions", status.conditions), group("Injuries", status.injuries)] }
  ];
  return finishPanel(tabs, label);
}

async function perform(actor, { type, id, extra }, mods, settings) {
  if (mods.right && ITEM_BACKED.has(type)) return actor.items.get(id)?.sheet?.render({ force: true });
  const context = testContext(mods, settings);
  switch (type) {
    case IM.action: return actor.system.useAction(id);
    case IM.characteristic: return actor.setupCharacteristicTest(id, context);
    case IM.skill: return actor.setupSkillTest({ key: id, itemId: extra || undefined }, context);
    case IM.weapon: return actor.setupWeaponTest(id, context);
    case IM.trait: return actor.setupTraitTest(id, context);
    case IM.power: return actor.setupPowerTest(id, context);
    case IM.dodge: return actor.setupSkillTest({ key: "reflexes", name: game.i18n.localize("IMPMAL.Dodge") }, context);
    case IM.initiative: return actor.rollInitiative({ createCombatants: true });
    case IM.warp: return actor.setupSkillTest({ key: "psychic" }, { ...context, warp: actor.system.warp.state });
    case IM.purge: return actor.purge();
    case IM.reload: {
      const weapon = actor.items.get(id);
      // Jak na karcie: system zwraca aktualizację magazynka albo rzuca komunikat (np. brak amunicji)
      try {
        return await weapon?.update(weapon.system.reload());
      } catch (err) {
        return ui.notifications.error(typeof err === "string" ? err : t("Notify.ActionFailed"));
      }
    }
    case IM.protection:
    case IM.sheet: return actor.items.get(id)?.sheet?.render({ force: true });
    case IM.use: return actor.useItem({ id, uuid: actor.items.get(id)?.uuid });
    case IM.equip: {
      const item = actor.items.get(id);
      if (!item) return;
      // Broń postaci gracza trzymają ręce (jak przycisk dłoni na karcie): do ręki wiodącej, a bez wybranej – do prawej
      if (item.type === "weapon" && actor.system.hands) {
        if (item.system.isEquipped) return item.system.unequip();
        return item.system.equip(actor.system.handed || "right");
      }
      return item.update({ "system.equipped.value": !item.system.equipped?.value });
    }
    case IM.condition:
      if (mods.right) return actor.removeCondition(id);
      return actor.addCondition(id);
    case IM.fate: {
      const { value = 0, max = 0 } = actor.system.fate ?? {};
      return actor.update({ "system.fate.value": Math.max(0, Math.min(max, value + (mods.right ? -1 : 1))) });
    }
  }
}

export const imActions = (getSetting) => systemActions(getSetting, { panel: imPanel, types: IM, perform, name: "Imperium Maledictum" });
