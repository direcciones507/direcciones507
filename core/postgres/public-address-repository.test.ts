import { describe, expect, test } from "bun:test";
import {
  normalizeAd507Code,
  postgresPublicReadEnabled,
} from "./public-address-repository";

describe("postgres public read feature gate", () => {
  test("fails closed when variable is absent", () => {
    expect(postgresPublicReadEnabled({})).toBe(false);
  });

  test("only exact true enables it", () => {
    expect(postgresPublicReadEnabled({ AD507_POSTGRES_PUBLIC_READ_ENABLED: "true" })).toBe(true);
    expect(postgresPublicReadEnabled({ AD507_POSTGRES_PUBLIC_READ_ENABLED: "TRUE" })).toBe(false);
    expect(postgresPublicReadEnabled({ AD507_POSTGRES_PUBLIC_READ_ENABLED: "1" })).toBe(false);
  });
});

describe("AD507 code normalization", () => {
  test("normalizes safe codes", () => {
    expect(normalizeAd507Code(" ad507-0042 ")).toBe("AD507-0042");
    expect(normalizeAd507Code("ad507-MI_NEGOCIO")).toBe("AD507-MI_NEGOCIO");
  });

  test("rejects malformed or injection-shaped values", () => {
    expect(normalizeAd507Code("507-0042")).toBeNull();
    expect(normalizeAd507Code("AD507-1'; DROP TABLE x;--")).toBeNull();
    expect(normalizeAd507Code("AD507-../secret")).toBeNull();
    expect(normalizeAd507Code("")).toBeNull();
  });
});
