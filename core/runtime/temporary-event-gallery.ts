/** Progressive-enhancement gallery for public temporary-event pages.
 * Mount only on [data-temporary-gallery] containers, never on existing plan cards.
 * HTML contract: direct [data-temporary-slide] elements and [data-temporary-dots] container.
 */
export function mountTemporaryEventGalleries(root:ParentNode=document):void{
 root.querySelectorAll<HTMLElement>('[data-temporary-gallery]').forEach(gallery=>{
  if(gallery.dataset.galleryMounted==='true')return;
  const slides=[...gallery.querySelectorAll<HTMLElement>('[data-temporary-slide]')];
  if(!slides.length)return;
  gallery.dataset.galleryMounted='true';
  const dots=gallery.querySelector<HTMLElement>('[data-temporary-dots]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current=0,timer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
  const show=(index:number)=>{
   current=(index+slides.length)%slides.length;
   slides.forEach((slide,i)=>{
    const active=i===current;
    slide.hidden=!active;slide.setAttribute('aria-hidden',String(!active));
   });
   dots?.querySelectorAll<HTMLButtonElement>('button').forEach((dot,i)=>{
    dot.setAttribute('aria-current',i===current?'true':'false');
    dot.setAttribute('aria-label',`Mostrar foto ${i+1} de ${slides.length}`);
   });
  };
  if(dots){
   dots.replaceChildren();
   slides.forEach((_,i)=>{
    const dot=document.createElement('button');
    dot.type='button';dot.className='temporary-gallery-dot';
    dot.addEventListener('click',()=>{stop();show(i);});
    dots.append(dot);
   });
  }
  let touchX:number|null=null;
  gallery.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX??null;},{passive:true});
  gallery.addEventListener('touchend',e=>{
   if(touchX===null)return;
   const x=e.changedTouches[0]?.clientX??touchX,delta=x-touchX;touchX=null;
   if(Math.abs(delta)<35)return;
   stop();show(current+(delta<0?1:-1));
  },{passive:true});
  gallery.addEventListener('keydown',e=>{
   if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
   stop();show(current+(e.key==='ArrowRight'?1:-1));
  });
  show(0);
  if(slides.length>1&&!reduced){
   let next=1;
   const advance=()=>{
    show(next);
    if(next===slides.length-1){timer=setTimeout(()=>{show(0);timer=undefined;},3500);}
    else{next++;timer=setTimeout(advance,3500);}
   };
   timer=setTimeout(advance,3500);
  }
  gallery.addEventListener('pointerdown',()=>{if(!('ontouchstart' in window))stop();});
 });
}
