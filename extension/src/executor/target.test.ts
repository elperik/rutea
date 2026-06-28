import { describe, expect, it } from "vitest";

import { pickSelector } from "./target.js";

describe("pickSelector", () => {
  it("devuelve el primer selector que casa", () => {
    const present = new Set(["#b", "#c"]);
    expect(pickSelector(["#a", "#b", "#c"], (s) => present.has(s))).toBe("#b");
  });

  it("devuelve undefined si ninguno casa", () => {
    expect(pickSelector(["#a", "#b"], () => false)).toBeUndefined();
  });

  it("devuelve undefined con lista vacía", () => {
    expect(pickSelector([], () => true)).toBeUndefined();
  });
});
