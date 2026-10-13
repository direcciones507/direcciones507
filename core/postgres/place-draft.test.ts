import { describe, expect, test } from "bun:test";
import { validatePlaceDraft } from "./place-draft";

describe("add place draft validation", () => {
  test("accepts the minimum place payload", () => {
    const result = validatePlaceDraft({
      name: "Parque Central",
      reference: "Frente a la iglesia",
      latitude: 8.1,
      longitude: -80.9,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("PLACE");
      expect(result.value.phone).toBeNull();
      expect(result.value.hours).toBeNull();
    }
  });

  test("rejects missing required fields", () => {
    expect(validatePlaceDraft({ name: "", reference: "Referencia", latitude: 8, longitude: -80 })).toEqual({
      ok: false, code: "INVALID_REQUEST", field: "name",
    });
    expect(validatePlaceDraft({ name: "Lugar", reference: "", latitude: 8, longitude: -80 })).toEqual({
      ok: false, code: "INVALID_REQUEST", field: "reference",
    });
  });

  test("rejects invalid coordinates", () => {
    expect(validatePlaceDraft({ name: "Lugar", reference: "Ref", latitude: 91, longitude: -80 })).toEqual({
      ok: false, code: "INVALID_REQUEST", field: "latitude",
    });
    expect(validatePlaceDraft({ name: "Lugar", reference: "Ref", latitude: 8, longitude: -181 })).toEqual({
      ok: false, code: "INVALID_REQUEST", field: "longitude",
    });
  });

  test("enforces bounded text fields", () => {
    const result = validatePlaceDraft({
      name: "Lugar",
      reference: "Ref",
      description: "x".repeat(801),
      latitude: 8,
      longitude: -80,
    });
    expect(result).toEqual({ ok: false, code: "INVALID_REQUEST", field: "description" });
  });
});
