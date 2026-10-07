import { describe, it, expect } from "vitest";
import { formErrors, pruneEmpty } from "./formValues";

describe("pruneEmpty", () => {
  it("drops undefined keys recursively, including inside list rows, and keeps real values", () => {
    expect(pruneEmpty({ a: 1, b: undefined, rows: [{ x: undefined, y: "k" }], geo: { latitude: 0, longitude: 0 } })).toEqual({
      a: 1,
      rows: [{ y: "k" }],
      geo: { latitude: 0, longitude: 0 },
    });
  });
  it("keeps empty strings and false so required-field validation still sees them", () => {
    expect(pruneEmpty({ s: "", f: false, n: 0 })).toEqual({ s: "", f: false, n: 0 });
  });
});

describe("formErrors", () => {
  it("keys messages by dotted path and keeps the first per path", () => {
    expect(
      formErrors([
        { path: ["days", 0, "title", "en"], message: "English text is required" },
        { path: ["days", 0, "title", "en"], message: "second" },
        { path: ["amountInr"], message: "Enter an amount" },
      ])
    ).toEqual({ "days.0.title.en": "English text is required", amountInr: "Enter an amount" });
  });
});
