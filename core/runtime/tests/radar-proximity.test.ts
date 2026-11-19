import {test,expect} from "bun:test";
import {distanceKm} from "../radar/ui/ui-model.js";
test("Radar distance is local, finite and handles date line",()=>{
 expect(distanceKm(8,-80,8,-80)).toBe(0);
 expect(distanceKm(0,0,0,1)).toBeCloseTo(111.195,2);
 expect(distanceKm(0,179.9,0,-179.9)).toBeCloseTo(22.239,2);
 expect(Number.isNaN(distanceKm(91,0,0,0))).toBe(true);
});
