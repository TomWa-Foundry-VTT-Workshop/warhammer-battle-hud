import { describe, expect, it } from "vitest";
import { careerCheck4e, careerCheck5e, careerCosts } from "../scripts/actions/career-check.mjs";
import { resolveIntent } from "../scripts/actions/intent.mjs";

const skillNames = ["Atletyka", "Mocna Głowa", "Opanowanie", "Plotkowanie", "Przekupstwo", "Unik", "Walka Wręcz (Podstawowa)", "Wycena", "Zastraszanie"];

describe("WFRP 4e: ukończenie poziomu kariery", () => {
  const base = {
    level: 1,
    characteristics: [{ key: "ws", label: "WW", advances: 5 }, { key: "t", label: "Wt", advances: 5 }],
    careerSkills: skillNames,
    skills: skillNames.slice(0, 8).map((name) => ({ name, advances: 5 })),
    careerTalents: ["Bijatyka", "Twardziel"],
    talents: ["Twardziel"]
  };

  it("wszystko wykupione: poziom ukończony", () => {
    const report = careerCheck4e(base);
    expect(report).toMatchObject({ needed: 5, complete: true, parts: { characteristics: true, skills: true, talent: true } });
    expect(report.skills).toMatchObject({ done: 8, required: 8 });
    expect(report.talents.owned).toEqual(["Twardziel"]);
  });

  it("wyższy poziom wymaga 5 × poziom rozwinięć", () => {
    const report = careerCheck4e({ ...base, level: 2 });
    expect(report.needed).toBe(10);
    expect(report.complete).toBe(false);
    expect(report.parts.characteristics).toBe(false);
  });

  it("brakująca cecha, umiejętność i talent są wskazane", () => {
    const report = careerCheck4e({
      ...base,
      characteristics: [{ key: "ws", label: "WW", advances: 3 }],
      skills: skillNames.slice(0, 7).map((name) => ({ name, advances: 5 })),
      talents: []
    });
    expect(report.parts).toEqual({ characteristics: false, skills: false, talent: false });
    expect(report.skills.rows.filter((s) => !s.owned).map((s) => s.name)).toEqual(["Wycena", "Zastraszanie"]);
  });

  it("nazwy umiejętności i talentów bez względu na wielkość liter", () => {
    const report = careerCheck4e({ ...base, skills: skillNames.slice(0, 8).map((name) => ({ name: name.toUpperCase(), advances: 6 })), talents: ["twardziel"] });
    expect(report.complete).toBe(true);
  });

  it("„(Dowolny)” bierze wolną specjalizację, bez liczenia jej dwa razy", () => {
    const careerSkills = ["Język (Gildii)", "Język (Dowolny)", "Wiedza (Any)"];
    const skills = [{ name: "Język (Gildii)", advances: 10 }, { name: "Język (Bretoński)", advances: 7 }, { name: "Język (Klasyczny)", advances: 3 }];
    const rows = careerCheck4e({ ...base, careerSkills, skills }).skills.rows;
    expect(rows.map((r) => [r.name, r.advances, r.owned])).toEqual([["Język (Gildii)", 10, true], ["Język (Bretoński)", 7, true], ["Wiedza (Any)", 0, false]]);
  });

  it("kariera z mniej niż 8 umiejętnościami wymaga wszystkich", () => {
    const report = careerCheck4e({ ...base, careerSkills: ["Unik", "Atletyka"], skills: [{ name: "Unik", advances: 5 }] });
    expect(report.skills).toMatchObject({ done: 1, required: 2 });
    expect(report.parts.skills).toBe(false);
  });

  it("koszty: ukończony poziom tańsza zmiana, inna klasa +100", () => {
    expect(careerCosts(careerCheck4e(base))).toEqual({ nextLevel: 100, sameClass: 100, otherClass: 200 });
    expect(careerCosts(careerCheck4e({ ...base, talents: [] }))).toEqual({ nextLevel: 100, sameClass: 200, otherClass: 300 });
  });
});

describe("WFRP 5e: postępy na ścieżce kariery", () => {
  it("brakujące postępy i następny poziom", () => {
    expect(careerCheck5e({ level: 1, done: 7, needed: 10, next: "Czeladnik" })).toMatchObject({ missing: 3, complete: false, next: "Czeladnik" });
    expect(careerCheck5e({ level: 2, done: 12, needed: 12 })).toMatchObject({ missing: 0, complete: true, next: null });
    expect(careerCosts(careerCheck5e({ level: 1, done: 0, needed: 10 }))).toEqual({ nextLevel: 100, sameClass: 100, otherClass: 200 });
  });

  it("klik sprawdza, prawy klik nic nie robi", () => {
    expect(resolveIntent("careerCheck", {})).toEqual({ intent: "use" });
    expect(resolveIntent("careerCheck", { right: true })).toEqual({ intent: "none" });
  });
});
