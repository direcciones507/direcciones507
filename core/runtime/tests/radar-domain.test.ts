import { test, expect } from "bun:test";
import { currentActivity, visiblePin, validCoordinates } from "../radar/domain";
test("expired and future reports are ignored", () => {
  const now = 1800000;
  expect(currentActivity([{state:"full",source:"community",createdAt:0},{state:"queue",source:"community",createdAt:now+1}],now)).toBeNull();
});
test("verified owner wins equal timestamp", () => {
  expect(currentActivity([{state:"full",source:"community",createdAt:1},{state:"available",source:"verified_owner",createdAt:1}],2)?.state).toBe("available");
});
test("commercial pins are disabled unless enabled and active", () => {
  const c = {kind:"live" as const,startsAt:1,endsAt:10};
  expect(visiblePin(c,5)).toBe("normal");
  expect(visiblePin(c,5,true)).toBe("live");
  expect(visiblePin(c,10,true)).toBe("normal");
});
test("coordinate bounds", () => {
  expect(validCoordinates(8,-80)).toBe(true);
  expect(validCoordinates(91,-80)).toBe(false);
  expect(validCoordinates(NaN,0)).toBe(false);
});
