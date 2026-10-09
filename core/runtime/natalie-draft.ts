/** Natalie: preparación determinista de borradores, sin IA ni escrituras. */
export type NatalieDraft = {
  kind: 'BUSINESS' | 'RESIDENTIAL' | 'PLACE' | null;
  plan: 'BUSINESS_FREE' | 'BUSINESS_PREMIUM' | 'BUSINESS_PREMIUM_PRO' | 'RESIDENTIAL' | 'PLACE' | null;
  name: string; reference: string; coordinates: string; phone: string; hours: string;
  description: string; photos: { name: string; type: string; size: number }[];
};
export function emptyNatalieDraft(): NatalieDraft {
  return { kind: null, plan: null, name: '', reference: '', coordinates: '', phone: '', hours: '', description: '', photos: [] };
}
export function prepareNatalieMessage(previous: NatalieDraft, message: string): NatalieDraft {
  const draft = { ...previous, photos: [...previous.photos] };
  const text = message.trim().slice(0, 5000);
  if (/premium\s*pro/i.test(text)) { draft.kind='BUSINESS'; draft.plan='BUSINESS_PREMIUM_PRO'; }
  else if (/premium/i.test(text)) { draft.kind='BUSINESS'; draft.plan='BUSINESS_PREMIUM'; }
  else if (/residencial/i.test(text)) { draft.kind='RESIDENTIAL'; draft.plan='RESIDENTIAL'; }
  else if (/\blugar\b/i.test(text)) { draft.kind='PLACE'; draft.plan='PLACE'; }
  else if (/negocio\s*gratis/i.test(text)) { draft.kind='BUSINESS'; draft.plan='BUSINESS_FREE'; }
  const coords = text.match(/(?:^|[^\d])([+-]?\d{1,2}\.\d+)\s*[,;]\s*([+-]?\d{1,3}\.\d+)(?!\d)/);
  if (coords && Math.abs(Number(coords[1]))<=90 && Math.abs(Number(coords[2]))<=180) draft.coordinates=coords[1]+', '+coords[2];
  const phone = text.match(/(?:tel[eé]fono|whatsapp|celular)\s*(?:es|:)?\s*([+]?[\d\s-]{7,20})/i);
  if (phone) draft.phone=phone[1].trim();
  const name = text.match(/(?:nombre\s*(?:del negocio)?|se llama)\s*(?:es|:)?\s*([^\n.,]{3,100})/i);
  if (name) draft.name=name[1].trim();
  const reference = text.match(/referencia\s*(?:es|:)?\s*([^\n]{3,300})/i);
  if (reference) draft.reference=reference[1].trim();
  const hours = text.match(/horario\s*(?:es|:)?\s*([^\n]{3,200})/i);
  if (hours) draft.hours=hours[1].trim();
  return draft;
}
export function natalieMissing(draft: NatalieDraft): string[] {
  const missing: string[]=[];
  if (!draft.plan) missing.push('tipo y plan');
  if (!draft.name) missing.push('nombre');
  if (!draft.coordinates) missing.push('coordenadas');
  if (!draft.reference) missing.push('referencia');
  if (draft.kind==='PLACE' && draft.photos.length===0) missing.push('fotografía');
  return missing;
}
