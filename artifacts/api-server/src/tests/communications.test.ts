import { describe, expect, it } from "vitest";
import { isValidPhoneNumber, normalizePhoneNumber } from "../lib/communications-utils";

describe("Communications SMS Helpers", () => {
  it("normalizes local numbers to international format", () => {
    expect(normalizePhoneNumber("0712345678")).toBe("+254712345678");
  });

  it("keeps E.164 numbers unchanged", () => {
    expect(normalizePhoneNumber("+254712345678")).toBe("+254712345678");
  });

  it("rejects invalid phone formats", () => {
    expect(isValidPhoneNumber("123")).toBe(false);
    expect(isValidPhoneNumber("+12abc345")).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });

  it("accepts valid E.164 numbers", () => {
    expect(isValidPhoneNumber("+254712345678")).toBe(true);
    expect(isValidPhoneNumber("+12025550123")).toBe(true);
  });
});
