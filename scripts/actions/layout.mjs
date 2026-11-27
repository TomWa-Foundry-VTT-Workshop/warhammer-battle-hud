/**
 * Układ panelu akcji: zakładki i grupy – bez zależności od Foundry.
 */
import { GROUP_IDS as G } from "./builders.mjs";

/** Grupy: id → klucz tłumaczenia nazwy. */
export const GROUPS = {
  [G.characteristics]: "WFRP4E_HUD.Groups.Characteristics",
  [G.weaponsMelee]: "WFRP4E_HUD.Groups.Melee",
  [G.weaponsRanged]: "WFRP4E_HUD.Groups.Ranged",
  [G.armour]: "WFRP4E_HUD.Groups.Armour",
  [G.traits]: "WFRP4E_HUD.Groups.Traits",
  [G.blessings]: "WFRP4E_HUD.Groups.Blessings",
  [G.miracles]: "WFRP4E_HUD.Groups.Miracles",
  [G.talents]: "WFRP4E_HUD.Groups.Talents",
  [G.extended]: "WFRP4E_HUD.Groups.ExtendedTests",
  [G.effects]: "WFRP4E_HUD.Groups.Effects",
  [G.conditions]: "WFRP4E_HUD.Groups.Conditions",
  [G.advantage]: "WFRP4E_HUD.Groups.Advantage",
  [G.advantageActions]: "WFRP4E_HUD.Groups.AdvantageActions",
  [G.equipment]: "WFRP4E_HUD.Groups.Equipment",
  [G.gangOrders]: "WFRP4E_HUD.Groups.GangOrders",
  [G.gangOrdersCombat]: "WFRP4E_HUD.Groups.GangOrders",
  [G.downtime]: "WFRP4E_HUD.Groups.Downtime",
  [G.channelledReset]: "WFRP4E_HUD.Groups.ChannelledReset"
};

/**
 * Zakładki: id → klucz tłumaczenia i grupy w kolejności. Układ jak w pozostałych systemach:
 * Walka kończy się grupą Ekwipunek; umiejętności są w kolumnach według cech (`dynamic: "skills"`), a czary w kolumnach według szkoły magii (`dynamic: "magic"`);
 * stany są w zakładce Stan. Zakładka z `edition` jest tylko w tej edycji zasad.
 *
 * WFRP 4e ma osobną, pierwszą zakładkę Przewaga (użycia Przewagi, rozkazy szajki, licznik) – Przewaga
 * jest tam główną walutą walki. W 5e nie ma puli Przewagi: zakładki nie ma, a rozkazy szajki są w Walce.
 */
export const LAYOUT = [
  { id: "advantage", name: "WFRP4E_HUD.Tabs.Advantage", edition: "4e", groups: [G.advantageActions, G.gangOrders, G.advantage] },
  { id: "combat", name: "WFRP4E_HUD.Tabs.Combat", groups: [G.gangOrdersCombat, G.weaponsMelee, G.weaponsRanged, G.armour, G.traits, G.equipment] },
  { id: "characteristics", name: "WFRP4E_HUD.Tabs.Characteristics", groups: [G.characteristics] },
  { id: "skills", name: "WFRP4E_HUD.Tabs.Skills", columns: 4, dynamic: "skills", groups: [] },
  { id: "magic", name: "WFRP4E_HUD.Tabs.Magic", columns: "auto", dynamic: "magic", groups: [G.channelledReset] },
  { id: "religion", name: "WFRP4E_HUD.Tabs.Religion", groups: [G.blessings, G.miracles] },
  { id: "talents", name: "WFRP4E_HUD.Tabs.Talents", groups: [G.talents, G.extended, G.effects] },
  { id: "status", name: "WFRP4E_HUD.Tabs.Status", groups: [G.conditions] },
  { id: "downtime", name: "WFRP4E_HUD.Tabs.Downtime", groups: [G.downtime] }
];
