import {expect,test} from "bun:test";
import {eligibleAddress} from "../radar/address-policy";
const valid={addressType:"BUSINESS",status:"ACTIVE",country:"PA",publiclyVisible:true,current:true,ownershipConfirmed:true};
test("eligible public business and place",()=>{
 expect(eligibleAddress(valid,"PA")).toBe(true);
 expect(eligibleAddress({...valid,addressType:"PLACE"},"PA")).toBe(true);
});
test("deny private, expired, unverified and missing data",()=>{
 for(const patch of [{addressType:"RESIDENTIAL"},{status:"SUSPENDED"},{country:"CO"},{publiclyVisible:false},{current:false},{ownershipConfirmed:false},{current:undefined},{publiclyVisible:undefined},{ownershipConfirmed:undefined}]){
  expect(eligibleAddress({...valid,...patch},"PA")).toBe(false);
 }
 expect(eligibleAddress(null,"PA")).toBe(false);
 expect(eligibleAddress({},"PA")).toBe(false);
});
