import { test, expect } from 'bun:test';
import { createNewAddressPublication } from '../new-address-publication';

const id='123e4567-e89b-42d3-a456-426614174000';
const request={id,type:'BUSINESS',plan:'FREE',name:'Prueba',requestedName:''};

test('refuses reservation when PostgreSQL already has the generated code',async()=>{
  const sql={unsafe:async()=>[{id:'another-address'}]} as any;
  const fetcher=(async()=>Response.json({ok:true,codes:[{codigo:'AD507-0001'}]})) as typeof fetch;
  const publication=createNewAddressPublication(sql,{namespaceExclusive:true,fetch:fetcher});
  expect(publication.reserve(request)).rejects.toThrow('CANONICAL_CODE_COLLISION');
});

test('refuses reservation if historical registry responds with HTML',async()=>{
  const sql={unsafe:async()=>[]} as any;
  const fetcher=(async()=>new Response('<html>Login</html>',{headers:{'content-type':'text/html'}})) as typeof fetch;
  const publication=createNewAddressPublication(sql,{namespaceExclusive:true,fetch:fetcher});
  expect(publication.reserve(request)).rejects.toThrow('HISTORICAL_REGISTRY_UNAVAILABLE');
});
