import { describe, expect, it } from "vitest";
import * as B from "../scripts/actions/builders.mjs";
import { resolveIntent } from "../scripts/actions/intent.mjs";
import * as TOW from "../scripts/actions/tow-builders.mjs";
import * as WNG from "../scripts/actions/wng-builders.mjs";

const env = { localize: (key) => key, config: {}, edition: "4e" };

describe("WFRP: między przygodami", () => {
  const merchant = {
    type: "character",
    system: { details: { status: { value: "Silver 5" } } },
    itemTypes: { career: [{ name: "Handlarz", system: { current: { value: false } } }, { name: "Kupiec", system: { current: { value: true } } }], skill: [] }
  };
  it("dochód z bieżącej kariery ze Statusem, odpoczynek i przedsięwzięcia", () => {
    const pages = [{ uuid: "JournalEntry.j.JournalEntryPage.p", name: "Consult an Expert", text: { content: "<p>Ask a scholar</p>" } }];
    const actions = B.buildDowntime(merchant, { ...env, endeavours: pages });
    expect(actions.map((a) => [a.encodedValue, a.info1?.text])).toEqual([["income", "Silver 5"], ["careerCheck", undefined], ["rest", undefined], ["endeavour|JournalEntry.j.JournalEntryPage.p", undefined]]);
    expect(actions[0].details.find((d) => d.label.endsWith("Career")).value).toBe("Kupiec");
    expect(actions[1].details.find((d) => d.label.endsWith("Career")).value).toBe("Kupiec");
  });
  it("bez kariery nie ma dochodu, stwory i pojazdy nie mają tej zakładki", () => {
    expect(B.buildDowntime({ type: "character", system: {}, itemTypes: {} }, env).map((a) => a.encodedValue)).toEqual(["rest"]);
    expect(B.buildDowntime({ type: "vehicle" }, env)).toEqual([]);
  });
  it("lewy klik wykonuje, prawy nic", () => {
    for (const type of ["income", "rest", "endeavour", "channelReset"]) {
      expect(resolveIntent(type, {})).toEqual({ intent: "use" });
      expect(resolveIntent(type, { right: true })).toEqual({ intent: "none" });
    }
  });
});

describe("WFRP: splatanie", () => {
  const mage = { type: "character", system: { status: {} }, itemTypes: { spell: [
    { id: "s1", name: "Wybuch", system: { lore: { value: "metal" }, cn: { value: 4, SL: 2 } } },
    { id: "s2", name: "Pancerz", system: { lore: { value: "metal" }, cn: { value: 2, SL: 0 } } }
  ] } };
  it("4e: zebrane PS przy zaklęciu, z wyróżnieniem i przyciskiem splatania", () => {
    const [metal] = B.buildSpellGroups(mage, env);
    expect(metal.actions.map((s) => [s.name, s.info1.text, s.cssClass])).toEqual([["Pancerz", "2", undefined], ["Wybuch", "2/4", "channelled"]]);
    expect(metal.actions[1].secondary.value).toBe("channel|s1");
  });
  it("utrata splecionej mocy pojawia się tylko, gdy jest co tracić", () => {
    expect(B.buildChannelledReset(mage, env)).toMatchObject([{ encodedValue: "channelReset", info1: { text: "2" } }]);
    expect(B.buildChannelledReset({ itemTypes: { spell: [] }, system: { status: { channelling: { value: 0 } } } }, env)).toEqual([]);
    expect(B.buildChannelledReset({ itemTypes: { spell: [] }, system: { status: { channelling: { value: 3, wind: "aqshy" } } } }, { ...env, edition: "5e" })[0].info1.text).toBe("3");
  });
});

describe("The Old World: przedsięwzięcia", () => {
  it("z samym testem wykonywane od razu, ze skryptem albo wyborem – przez stronę", () => {
    const pages = [
      { uuid: "u1", name: "Carouse", flags: { whtow: { endeavour: { test: { skill: "charm" } } } } },
      { uuid: "u2", name: "Study", flags: { whtow: { endeavour: { chooseSkill: true } } } }
    ];
    const actions = TOW.buildEndeavours({ localize: (k) => k, config: { skills: { charm: "Charm" } }, endeavours: pages });
    expect(actions.map((a) => [a.value, a.detail, a.tooltip.hint])).toEqual([["endeavour|u1", "Charm", "WHB_TOW.Hint.EndeavourTest"], ["endeavour|u2", "", "WHB_TOW.Hint.EndeavourPage"]]);
  });
});

describe("Wrath & Glory: Wpływy i Bogactwo", () => {
  it("test Wpływów i Bogactwo do zmiany", () => {
    const status = WNG.buildStatus({ system: { resources: { wrath: 1, influence: 2, wealth: 3 }, corruption: { current: 0 } } }, { localize: (k) => k, statusEffects: [] });
    expect(status.social.map((a) => [a.value, a.detail])).toEqual([["generic|influence", "2"], ["wealth", "3"]]);
  });
});
