export type PlaceDraftInput = {
  name: string;
  reference: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  hours?: string | null;
};

export type ValidatedPlaceDraft = {
  type: "PLACE";
  name: string;
  reference: string;
  description: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  hours: string | null;
};

function cleanText(value: unknown, max: number, required = false): string | null {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return required ? null : "";
  if (text.length > max) return null;
  return text;
}

export function validatePlaceDraft(input: PlaceDraftInput):
  | { ok: true; value: ValidatedPlaceDraft }
  | { ok: false; code: "INVALID_REQUEST"; field: string } {
  const name = cleanText(input.name, 120, true);
  if (!name) return { ok: false, code: "INVALID_REQUEST", field: "name" };

  const reference = cleanText(input.reference, 300, true);
  if (!reference) return { ok: false, code: "INVALID_REQUEST", field: "reference" };

  const description = cleanText(input.description, 800);
  if (description === null) return { ok: false, code: "INVALID_REQUEST", field: "description" };

  const phone = cleanText(input.phone, 40);
  if (phone === null) return { ok: false, code: "INVALID_REQUEST", field: "phone" };

  const hours = cleanText(input.hours, 180);
  if (hours === null) return { ok: false, code: "INVALID_REQUEST", field: "hours" };

  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, code: "INVALID_REQUEST", field: "latitude" };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, code: "INVALID_REQUEST", field: "longitude" };
  }

  return {
    ok: true,
    value: {
      type: "PLACE",
      name,
      reference,
      description: description || null,
      latitude,
      longitude,
      phone: phone || null,
      hours: hours || null,
    },
  };
}
