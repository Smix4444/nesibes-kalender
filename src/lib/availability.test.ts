import { describe, expect, it } from "vitest";
import {
  busyToMinutes,
  freeRatio,
  freeWindows,
  mergeIntervals,
  startOptions,
  subtractIntervals,
  type AvailabilityRule,
} from "./availability";
import { atLocalTime, weekdayIndex } from "./dates";

// 2026-11-23 is een maandag, 2026-11-28 een zaterdag.
const MONDAY = "2026-11-23";
const SATURDAY = "2026-11-28";

const rules: AvailabilityRule[] = [
  { weekday: 0, start_time: "16:00", end_time: "22:00" }, // maandag
  { weekday: 5, start_time: "10:00", end_time: "23:00" }, // zaterdag
];

const slot = (day: string, from: string, to: string) => ({
  starts_at: atLocalTime(day, from).toISOString(),
  ends_at: atLocalTime(day, to).toISOString(),
});

describe("weekdayIndex", () => {
  it("telt maandag als 0 en zondag als 6", () => {
    expect(weekdayIndex("2026-11-23")).toBe(0);
    expect(weekdayIndex("2026-11-28")).toBe(5);
    expect(weekdayIndex("2026-11-29")).toBe(6);
  });
});

describe("mergeIntervals", () => {
  it("voegt overlappende en aansluitende stukken samen", () => {
    expect(mergeIntervals([{ start: 0, end: 60 }, { start: 60, end: 120 }])).toEqual([
      { start: 0, end: 120 },
    ]);
    expect(mergeIntervals([{ start: 0, end: 90 }, { start: 30, end: 120 }])).toEqual([
      { start: 0, end: 120 },
    ]);
  });

  it("laat losse stukken los", () => {
    expect(mergeIntervals([{ start: 0, end: 60 }, { start: 120, end: 180 }])).toHaveLength(2);
  });
});

describe("subtractIntervals", () => {
  it("knipt een gat in het midden", () => {
    expect(subtractIntervals([{ start: 0, end: 120 }], [{ start: 30, end: 60 }])).toEqual([
      { start: 0, end: 30 },
      { start: 60, end: 120 },
    ]);
  });

  it("verwijdert een volledig bedekt venster", () => {
    expect(subtractIntervals([{ start: 30, end: 60 }], [{ start: 0, end: 120 }])).toEqual([]);
  });
});

describe("freeWindows", () => {
  it("geeft het hele venster als er niets bezet is", () => {
    expect(freeWindows(MONDAY, rules, [])).toEqual([{ start: 960, end: 1320 }]);
  });

  it("trekt een bezette afspraak af", () => {
    const busy = [slot(MONDAY, "18:00", "19:00")];
    expect(freeWindows(MONDAY, rules, busy)).toEqual([
      { start: 960, end: 1080 },
      { start: 1140, end: 1320 },
    ]);
  });

  it("geeft niets op een dag zonder regel", () => {
    expect(freeWindows("2026-11-24", rules, [])).toEqual([]);
  });

  it("negeert bezette tijd buiten de vrije vensters", () => {
    expect(freeWindows(MONDAY, rules, [slot(MONDAY, "09:00", "10:00")])).toEqual([
      { start: 960, end: 1320 },
    ]);
  });
});

describe("busyToMinutes — randen van de dag", () => {
  it("kapt een afspraak over middernacht af op de dagrand", () => {
    const busy = [
      { starts_at: atLocalTime(SATURDAY, "22:00").toISOString(), ends_at: atLocalTime("2026-11-29", "02:00").toISOString() },
    ];
    expect(busyToMinutes(SATURDAY, busy)).toEqual([{ start: 1320, end: 1440 }]);
  });

  it("laat een afspraak van de vorige dag niet meetellen", () => {
    const busy = [
      { starts_at: atLocalTime("2026-11-27", "20:00").toISOString(), ends_at: atLocalTime("2026-11-27", "23:00").toISOString() },
    ];
    expect(busyToMinutes(SATURDAY, busy)).toEqual([]);
  });
});

describe("zomer- en wintertijd", () => {
  // Laatste zondag van maart 2026 = 29/03 (klok vooruit), oktober = 25/10.
  it("rekent op de korte dag (klok vooruit) met echte tijdstippen", () => {
    const day = "2026-03-29";
    // 01:00 -> 03:00 lokaal is in werkelijkheid maar 1 uur.
    const busy = [
      { starts_at: atLocalTime(day, "01:00").toISOString(), ends_at: atLocalTime(day, "03:00").toISOString() },
    ];
    const [interval] = busyToMinutes(day, busy);
    expect(interval.start).toBe(60);
    // 60 minuten echte tijd na 01:00 lokaal = 03:00 lokaal.
    expect(interval.end).toBe(120);
  });

  it("rekent op de lange dag (klok achteruit)", () => {
    const day = "2026-10-25";
    const busy = [
      { starts_at: atLocalTime(day, "01:00").toISOString(), ends_at: atLocalTime(day, "04:00").toISOString() },
    ];
    const [interval] = busyToMinutes(day, busy);
    expect(interval.start).toBe(60);
    // Die dag duurt 25 uur, dus 01:00 -> 04:00 lokaal is 4 uur echte tijd.
    expect(interval.end).toBe(300);
  });
});

describe("startOptions", () => {
  it("geeft kwartieren waarin de afspraak helemaal past", () => {
    const options = startOptions([{ start: 960, end: 1050 }], 60);
    expect(options).toEqual(["16:00", "16:15", "16:30"]);
  });

  it("geeft niets als de afspraak te lang is", () => {
    expect(startOptions([{ start: 960, end: 1000 }], 60)).toEqual([]);
  });

  it("begint op het eerste hele kwartier", () => {
    expect(startOptions([{ start: 962, end: 1100 }], 30)[0]).toBe("16:15");
  });
});

describe("freeRatio", () => {
  it("is 1 als er niets gepland staat en 0 op een vrije dag zonder regels", () => {
    expect(freeRatio(MONDAY, rules, [])).toBe(1);
    expect(freeRatio("2026-11-24", rules, [])).toBe(0);
  });

  it("halveert bij een afspraak van de helft van de tijd", () => {
    expect(freeRatio(MONDAY, rules, [slot(MONDAY, "16:00", "19:00")])).toBe(0.5);
  });
});
