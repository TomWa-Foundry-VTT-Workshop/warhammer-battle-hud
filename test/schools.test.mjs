import { describe, expect, it, vi } from "vitest";
import * as B from "../scripts/actions/builders.mjs";
import { autoColumns, groupBySchool } from "../scripts/actions/system-panel.mjs";
import { towPanel } from "../scripts/actions/tow.mjs";

const spell = (id, name, lore, cn = 4) => ({ id, name, type: "spell", system: { lore: { value: lore }, cn: { value: cn } } });

describe("magia według szkół", () => {
  it("kolejność z konfiguracji, potem alfabetycznie, bez szkoły na końcu", () => {
    const actions = ["", "zeta", "fire", "alpha", "death"].map((school) => ({ school, name: school }));
    const groups = groupBySchool(actions, { order: ["death", "fire"], labelOf: (k) => k, otherLabel: "Other" });
    expect(groups.map((g) => g.label)).toEqual(["death", "fire", "alpha", "zeta", "Other"]);
  });

  it("liczba kolumn: tyle, ile szkół, najwyżej cztery", () => {
    expect([autoColumns("auto", 0), autoColumns("auto", 2), autoColumns("auto", 7), autoColumns(4, 1)]).toEqual([1, 2, 4, 4]);
  });

  it("WFRP: nagłówek z Wiatrem, bez „None”; czar z kilkoma tradycjami raz", () => {
    const config = { magicLores: { petty: "Petty", death: "Death", witchcraft: "Witchcraft" }, magicWind: { petty: "W.petty", death: "W.death", witchcraft: "W.witch" } };
    const words = { Petty: "Petty", Death: "Death", Witchcraft: "Witchcraft", "W.petty": "None", "W.death": "Shyish", "W.witch": "None", "WFRP4E.MagicWind.petty": "None" };
    const env = { localize: (k) => words[k] ?? k, edition: "4e", config };
    const actor = { itemTypes: { spell: [spell("a", "Hex", "witchcraft"), spell("b", "Drain", ["death", "witchcraft"]), spell("c", "Spark", "petty"), spell("d", "Strange", "salt"), spell("e", "Plain", "")] } };
    const groups = B.buildSpellGroups(actor, env);
    expect(groups.map((g) => [g.label, g.actions.map((a) => a.name)])).toEqual([
      ["Petty", ["Spark"]],
      ["Death (Shyish)", ["Drain"]],
      ["Witchcraft", ["Hex"]],
      ["salt", ["Strange"]],
      ["WFRP4E_HUD.Groups.NoLore", ["Plain"]]
    ]);
  });

  it("The Old World: rzucanie z tradycji nad jej zaklęciami, Miscasty osobno", () => {
    const item = (name, system) => ({ uuid: `Item.${name}`, id: name, name, img: "x", system });
    const actor = {
      type: "character",
      system: { magic: { level: 1, miscasts: 1, lores: { elementalism: { label: "Elementalism", spells: [{}] } } } },
      itemTypes: { spell: [item("Fireball", { cv: 3, lore: "elementalism" })], weapon: [], armour: [], ability: [], talent: [], lore: [], wound: [] }
    };
    const env = { localize: (k) => k, config: { magicLore: { elementalism: "Elementalism" } } };
    // Nazwy zakładek tłumaczy Foundry
    vi.stubGlobal("game", { i18n: { localize: (k) => k } });
    const magic = towPanel(actor, env).find((t) => t.id === "magic");
    vi.unstubAllGlobals();
    expect(magic.columns).toBe(2);
    expect(magic.groups.map((g) => g.actions.map((a) => a.value))).toEqual([["castLore|elementalism", "spell|Item.Fireball|elementalism"], ["miscastDispose", "miscastRoll"]]);
  });
});
