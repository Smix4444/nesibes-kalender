import { describe, expect, it } from "vitest";
import { sortBids, sortRequests } from "./priority";

const req = (
  name: string,
  role: "admin" | "vip" | "member",
  is_priority: boolean,
  created_at: string,
) => ({ name, role, is_priority, created_at });

describe("sortRequests — Nesibe's inbox", () => {
  it("zet Rayan boven Dragos en Dragos boven gewone members", () => {
    const sorted = sortRequests([
      req("tuana", "member", false, "2026-11-01T10:00:00Z"),
      req("dragos", "vip", false, "2026-11-02T10:00:00Z"),
      req("rayan", "admin", false, "2026-11-03T10:00:00Z"),
    ]);
    expect(sorted.map((r) => r.name)).toEqual(["rayan", "dragos", "tuana"]);
  });

  it("zet priority boven gewoon binnen dezelfde rol", () => {
    const sorted = sortRequests([
      req("melisa", "member", false, "2026-11-01T10:00:00Z"),
      req("tuana", "member", true, "2026-11-02T10:00:00Z"),
    ]);
    expect(sorted.map((r) => r.name)).toEqual(["tuana", "melisa"]);
  });

  it("zet bij gelijke rol en priority de oudste eerst", () => {
    const sorted = sortRequests([
      req("laat", "member", true, "2026-11-05T10:00:00Z"),
      req("vroeg", "member", true, "2026-11-01T10:00:00Z"),
    ]);
    expect(sorted.map((r) => r.name)).toEqual(["vroeg", "laat"]);
  });

  it("laat rol zwaarder wegen dan priority", () => {
    const sorted = sortRequests([
      req("tuana", "member", true, "2026-11-01T10:00:00Z"),
      req("dragos", "vip", false, "2026-11-02T10:00:00Z"),
    ]);
    expect(sorted[0].name).toBe("dragos");
  });
});

const bid = (
  name: string,
  amount: number,
  role: "admin" | "vip" | "member",
  updated_at: string,
  is_priority = false,
) => ({ name, amount, role, updated_at, is_priority });

describe("sortBids — aanbevolen winnaar", () => {
  it("laat het hoogste bod winnen, ongeacht rol", () => {
    const sorted = sortBids([
      bid("rayan", 1, "admin", "2026-11-01T10:00:00Z"),
      bid("tuana", 3, "member", "2026-11-01T11:00:00Z"),
    ]);
    expect(sorted[0].name).toBe("tuana");
  });

  it("laat Dragos een gelijk bod van een member winnen", () => {
    const sorted = sortBids([
      bid("tuana", 1, "member", "2026-11-01T10:00:00Z"),
      bid("dragos", 1, "vip", "2026-11-01T11:00:00Z"),
    ]);
    expect(sorted[0].name).toBe("dragos");
  });

  it("laat Rayan een gelijk bod van Dragos winnen", () => {
    const sorted = sortBids([
      bid("dragos", 2, "vip", "2026-11-01T10:00:00Z"),
      bid("rayan", 2, "admin", "2026-11-01T11:00:00Z"),
    ]);
    expect(sorted[0].name).toBe("rayan");
  });

  it("laat bij gelijk bod en gelijke rol het oudste bod winnen", () => {
    const sorted = sortBids([
      bid("b", 2, "member", "2026-11-01T12:00:00Z"),
      bid("a", 2, "member", "2026-11-01T09:00:00Z"),
    ]);
    expect(sorted.map((b) => b.name)).toEqual(["a", "b"]);
  });

  it("laat priority meespelen voor de tijd", () => {
    const sorted = sortBids([
      bid("gewoon", 2, "member", "2026-11-01T09:00:00Z", false),
      bid("priority", 2, "member", "2026-11-01T12:00:00Z", true),
    ]);
    expect(sorted[0].name).toBe("priority");
  });
});
