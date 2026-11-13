/** Visual layer for NEW Core cards only. No data, plan policy, URLs or actions. */
export const publicCardMotionStyle = `
body.public-card-motion{background:radial-gradient(ellipse at 12% 0,#1d3866 0,transparent 48%),#0e1d38;color:#f5f1e8}
body.public-card-motion .card{background:#14284b;border:1px solid #8fb0ea40;box-shadow:0 24px 70px #040c204d;animation:pcm-arrive .65s cubic-bezier(.22,1,.36,1) both;transition:transform .75s cubic-bezier(.22,1,.36,1);transform-origin:50% 180px}
@keyframes pcm-arrive{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}
/* Decorative light stays behind the identity content and never captures taps. */
body.public-card-motion .card{box-shadow:0 24px 70px #040c204d,0 0 0 1px #adc5e51a,0 0 28px #527eb51f}
body.public-card-motion .card .identity-block::before,body.public-card-motion .card .identity-block::after{content:"";position:absolute;pointer-events:none;z-index:-1;left:12%;top:12%;width:78%;height:70%;border-radius:50%;border:1.5px solid #b9cee8a6;border-left-color:#527eb580;border-bottom-color:#527eb54d;box-shadow:0 0 12px #8daedb38,inset 0 0 10px #b9cee824;transform:perspective(900px) rotateX(35deg) rotateZ(-14deg);animation:pcm-orbit 16s ease-in-out infinite}
body.public-card-motion .card .identity-block::after{left:16%;top:19%;width:70%;height:60%;opacity:.55;animation-direction:reverse;animation-duration:21s;border-top-color:#e2eaf3c9;border-right-color:#527eb538}
@keyframes pcm-orbit{0%,100%{transform:perspective(900px) rotateX(35deg) rotateY(-12deg) rotateZ(-14deg);opacity:.65}50%{transform:perspective(900px) rotateX(56deg) rotateY(14deg) rotateZ(16deg);opacity:.95}}
body.public-card-motion .card #logoNegocio{animation:pcm-photo-light 7s ease-in-out infinite}
@keyframes pcm-photo-light{0%,100%{box-shadow:0 12px 26px #030b2040,0 0 0 1px #b9cee84d,0 0 12px #527eb533}50%{box-shadow:0 16px 30px #030b2059,0 0 0 1px #d9e4f2a6,0 0 22px #8daedb59}}
body.public-card-motion .card :is(.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item,.footer-social-center a,button){position:relative;overflow:hidden;isolation:isolate}
body.public-card-motion .card :is(.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item,.footer-social-center a,button)::after{content:"";position:absolute;pointer-events:none;inset:0 auto 0 -65%;width:45%;background:linear-gradient(105deg,transparent,#d9e4f200 12%,#d9e4f240 48%,#ffffff70 53%,#b9cee824 62%,transparent 86%);transform:translateX(0) skewX(-18deg);animation:pcm-silver-sweep 8s ease-in-out infinite;animation-delay:var(--pcm-shine-delay,0s);opacity:0}
@keyframes pcm-silver-sweep{0%,8%{transform:translateX(0) skewX(-18deg);opacity:0}12%{opacity:.8}30%{transform:translateX(400%) skewX(-18deg);opacity:0}100%{transform:translateX(400%) skewX(-18deg);opacity:0}}
@media(max-width:640px){body.public-card-motion .card .identity-block::before{left:22%;top:-12%;width:74%;height:112%}body.public-card-motion .card .identity-block::after{left:26%;top:0;width:66%;height:90%}}
body.public-card-motion .card .code-header{background:#14284b!important;border-bottom:1px solid #8fb0ea24}
body.public-card-motion .card .identity-block{background:linear-gradient(135deg,#14284b,#0e1d38)!important;color:#f5f1e8}
body.public-card-motion .card :is(.brand-title-text,.footer-title-main){color:#f5f1e8!important}
body.public-card-motion .card :is(.brand-title-text span,.footer-title-main span,.brand-icon-main){color:#8fb0ea!important}
body.public-card-motion .card :is(.brand-subtitle-text,.brand-subtitle-sub,.footer-subtitle-sub,.secure-desc-text){color:#bdcce1!important}
body.public-card-motion .card #nombre{color:#f5f1e8!important;letter-spacing:-.025em}
body.public-card-motion .card #codigo{color:#a9c4ed!important}
body.public-card-motion .card #logoNegocio{object-fit:contain!important;border-color:#a5bfdf80!important;box-shadow:0 12px 26px #030b2040;transition:box-shadow .25s ease,scale .3s ease}
body.public-card-motion .card .white-sheet{background:#101f39!important;border-top:1px solid #8fb0ea24;color:#f5f1e8}
body.public-card-motion .card #commercialDescription{background:#1b3457!important;border:1px solid #8fb0ea45!important;border-radius:20px!important;box-shadow:0 8px 24px #040c2026!important;color:#f5f1e8!important}
body.public-card-motion .card #commercialDescription .commercial-description-text{font-family:Inter,system-ui,sans-serif!important;font-size:clamp(14px,1.3vw,17px)!important;line-height:1.65!important;color:#e0e9f5!important}
body.public-card-motion .card .public-lower-title{color:#f5f1e8!important;letter-spacing:-.015em}
body.public-card-motion .card .public-business-info{background:#1b3457!important;border-color:#8fb0ea45!important;border-radius:20px;box-shadow:0 8px 24px #040c2026}
body.public-card-motion .card .white-sheet .btn-action-triple{background:#1b3457!important;border:1px solid #8fb0ea45!important;border-radius:15px;color:#f5f1e8!important;box-shadow:0 5px 16px #040c2026}
body.public-card-motion .card .white-sheet .btn-action-triple :is(span,p){color:#d3e0f2!important}
body.public-card-motion .card .white-sheet .accordion-item{background:#18304f!important;border-color:#8fb0ea38!important;color:#f5f1e8!important}
body.public-card-motion .card .white-sheet .accordion-item .accordion-label{color:#bbcee6!important}
body.public-card-motion .card .white-sheet .accordion-item .accordion-value{color:#f5f1e8!important}
body.public-card-motion .card .white-sheet :is(.accordion-icon-left,.accordion-arrow-right){background:#8fb0ea14!important;border-color:#8fb0ea38!important;color:#a9c4ed!important}
body.public-card-motion .card .white-sheet .accordion-icon-left i{color:#a9c4ed!important}
body.public-card-motion .card .white-sheet .qr-box{background:#14284b!important;border-color:#8fb0ea38!important;color:#f5f1e8!important;border-radius:16px}
body.public-card-motion .card .white-sheet .qr-box h3{color:#d3e0f2!important}
body.public-card-motion .card .white-sheet .qr-box img{background:#fff!important}
body.public-card-motion .card :is(.gallery-label,.gallery-business-status,.seo-text){color:#bbcee6!important}
body.public-card-motion .card .premium-footer{background:#0e1d38!important;border-top:1px solid #8fb0ea30;color:#f5f1e8}
body.public-card-motion .card .secure-title-text{color:#e4ecf7!important}
/* External navigation and social-brand colors remain in their original rules. */
body.public-card-motion .card :is(.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item){transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
body.public-card-motion .card :is(a,button,.accordion-item):active{scale:.98}
body.public-card-motion .card :is(a,button,.accordion-item):focus-visible{outline:3px solid #b5ccef;outline-offset:3px}
body.public-card-motion .card .negocio-galeria img{object-fit:contain!important;transition:scale .3s ease,box-shadow .3s ease;border-radius:15px;box-shadow:0 6px 20px #030b2026}
body.public-card-motion #lightboxOverlay{backdrop-filter:blur(5px)}
body.public-card-motion #lightboxOverlay.show .lightbox-img{animation:pcm-photo-open .25s ease both}
@keyframes pcm-photo-open{from{opacity:.5;translate:0 8px}to{opacity:1;translate:0 0}}
body.public-card-motion .pcm-reveal{opacity:0;translate:0 14px;transition:opacity .6s ease,translate .6s cubic-bezier(.22,1,.36,1)}
body.public-card-motion .pcm-reveal.pcm-visible{opacity:1;translate:0 0}
@media(hover:hover) and (pointer:fine) and (min-width:1000px){body.public-card-motion .card{transform:perspective(1600px) rotateX(var(--pcm-x,0deg)) rotateY(var(--pcm-y,0deg))}body.public-card-motion .card :is(.btn-action-triple,.nav-box,.btn-social-quad):hover{transform:translateY(-2px);box-shadow:0 10px 22px #030b2040}body.public-card-motion .card .negocio-galeria img:hover{scale:1.015;box-shadow:0 12px 26px #030b204d}}
@media(prefers-reduced-motion:reduce){body.public-card-motion .card,body.public-card-motion #lightboxOverlay.show .lightbox-img{animation:none!important;transform:none!important;translate:none!important}body.public-card-motion .pcm-reveal{opacity:1;translate:none!important}body.public-card-motion .card :is(a,button,img,.accordion-item){transition:none!important;scale:1!important;transform:none!important}}
@media(prefers-reduced-motion:reduce){body.public-card-motion .card .identity-block::before,body.public-card-motion .card .identity-block::after,body.public-card-motion .card #logoNegocio,body.public-card-motion .card :is(.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item,.footer-social-center a,button)::after{animation:none!important}body.public-card-motion .card :is(.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item,.footer-social-center a,button)::after{opacity:0!important}}
`;

export const publicCardMotionScript = `(function(){
 function start(){
  var card=document.querySelector('body.public-card-motion .card');if(!card)return;
  card.querySelectorAll('.nav-box,.btn-social-quad,.btn-action-triple,.accordion-item,.footer-social-center a,button').forEach(function(button,index){button.style.setProperty('--pcm-shine-delay',((index%8)*.24).toFixed(2)+'s');});
  var reduce=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine) and (min-width:1000px)');
  var frame=0,x=0,y=0;
  function reset(){if(frame)cancelAnimationFrame(frame);frame=0;card.style.removeProperty('--pcm-x');card.style.removeProperty('--pcm-y');}
  card.addEventListener('pointermove',function(event){
   if(reduce.matches||!fine.matches||event.pointerType!=='mouse')return;
   if(event.target.closest('a,button,input,.accordion-item,#galeriaFotos,#logoBox')){reset();return;}
   var box=card.getBoundingClientRect();x=Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1));y=Math.max(-1,Math.min(1,(event.clientY-box.top)/box.height*2-1));
   if(!frame)frame=requestAnimationFrame(function(){card.style.setProperty('--pcm-x',(-y*1.2).toFixed(2)+'deg');card.style.setProperty('--pcm-y',(x*1.5).toFixed(2)+'deg');frame=0;});
  });
  card.addEventListener('pointerleave',reset);card.addEventListener('pointercancel',reset);card.addEventListener('focusin',reset);window.addEventListener('scroll',reset,{passive:true});reduce.addEventListener('change',reset);fine.addEventListener('change',reset);
  if(!('IntersectionObserver' in window)||reduce.matches)return;
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('pcm-visible');observer.unobserve(entry.target);}});},{threshold:.06});
  card.querySelectorAll('.identity-block,#commercialDescription,#premiumGalleryContainer,.public-navigation-section,.public-business-info,.public-social-section,.premium-footer').forEach(function(section){section.classList.add('pcm-reveal');observer.observe(section);});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();`;

export function publicCardPresentation(html:string):string {
 return html.replace('<body>','<body class="public-card-motion">')
  .replace('</head>','<style id="new-public-card-motion">'+publicCardMotionStyle+'</style></head>')
  .replace('</body>','<script id="new-public-card-motion-script">'+publicCardMotionScript+'</script></body>');
}
