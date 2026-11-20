import {test,expect} from "bun:test";
import {validateRegistration} from "../radar/registration";
const draft={name:" Comercio ",category:" tienda ",country:"PA",latitude:8,longitude:-80};
test("normalizes input and ignores privileged fields",()=>{
 expect(validateRegistration({...draft,published:true,accountRef:"other",verified:true})).toEqual({name:"Comercio",category:"tienda",country:"PA",latitude:8,longitude:-80});
});
test("rejects invalid country, coordinates and empty fields",()=>{
 for(const input of [null,[],{...draft,country:"XX"},{...draft,latitude:91},{...draft,longitude:"-80"},{...draft,name:" "},{...draft,category:"x".repeat(81)}])expect(validateRegistration(input)).toBeNull();
});
