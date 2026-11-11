/** Metadata for a shareable, non-indexed temporary event page. */
export type TemporaryEventShare={
 name:string;description:string;imageUrl:string;canonicalUrl:string;
};
function escapeHtml(value:string):string{
 return value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
}
function httpsUrl(value:string):string{
 let url:URL;try{url=new URL(value);}catch{throw Error('INVALID_EVENT_SHARE_URL');}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('INVALID_EVENT_SHARE_URL');
 return url.href;
}
/** Stable readable slug, never an AD507 commercial code. */
export function temporaryEventSlug(name:string):string{
 const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/,'');
 if(!slug)throw Error('INVALID_EVENT_NAME');
 return slug;
}
/** Caller must check slug uniqueness transactionally and add an opaque suffix on collision. */
export function temporaryEventShareMeta(event:TemporaryEventShare):string{
 const title=escapeHtml(event.name.trim());
 const description=escapeHtml(event.description.trim().slice(0,240));
 const image=escapeHtml(httpsUrl(event.imageUrl));
 const url=escapeHtml(httpsUrl(event.canonicalUrl));
 if(!title)throw Error('INVALID_EVENT_NAME');
 return [
 '<meta name="robots" content="noindex,nofollow,noarchive">',
 '<meta name="googlebot" content="noindex,nofollow,noarchive">',
 '<meta property="og:type" content="website">',
 `<meta property="og:title" content="${title}">`,
 `<meta property="og:description" content="${description}">`,
 `<meta property="og:image" content="${image}">`,
 `<meta property="og:url" content="${url}">`,
 '<meta name="twitter:card" content="summary_large_image">',
 `<meta name="twitter:title" content="${title}">`,
 `<meta name="twitter:description" content="${description}">`,
 `<meta name="twitter:image" content="${image}">`
 ].join('\n');
}
