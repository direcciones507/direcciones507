export const sharedVisualStyle = `/* Shared visual contract; no event handlers, data or access rules. */
body .hidden,body [hidden]{display:none!important}
body header.top .btn{min-height:44px}
:where(button,a.button,a.btn,.latam-cta,.latam-secondary){font-family:inherit;line-height:1.35;text-decoration:none;box-sizing:border-box}
body :is(#panel,#login,#requestDetail,#latamAccess,.latam-header,.latam-hero,.latam-plan-grid,.wrap) :is(button:not(.tile):not([data-latam-legal]),a.button,a.btn,.latam-cta,.latam-secondary),body header :is(button,a.btn){min-height:44px;max-width:100%;padding:11px 18px;border-radius:12px;font-size:15px;font-weight:700;line-height:1.35;white-space:normal;overflow-wrap:anywhere;align-items:center;justify-content:center;gap:8px;text-align:center;text-decoration:none}
body :is(a.button,a.btn,.latam-cta,.latam-secondary){display:inline-flex}
body :is(button,a.button,a.btn,.latam-cta,.latam-secondary):focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
body :is(button,a.button,a.btn):disabled,body [aria-disabled="true"]{opacity:.55;cursor:not-allowed;box-shadow:none;transform:none}
body :is(button,a.button,a.btn)[aria-busy="true"]{cursor:progress}
@media(hover:hover){body :is(button,a.button,a.btn):not(:disabled):hover{filter:brightness(.96)}}
body :is(input,select,textarea){max-width:100%;min-width:0;font:inherit}
body :is(.card,.tile,.address-card,.section-card,.latam-plan-card){min-width:0;overflow-wrap:anywhere}
body .address-top{align-items:flex-start;gap:12px}body .address-status{margin-left:auto;flex-shrink:0}
body .address-name{line-height:1.25;margin:0;font-size:clamp(21px,2.5vw,27px)}
body .address-actions{align-items:stretch;gap:10px}body .address-actions :is(button,a){margin:0;min-width:0}
body #requestDetail{scroll-margin-top:20px}body #requestDetail>div{display:flow-root}body #requestDetail img{border-radius:14px;background:#f1f5f9;width:auto}body #requestDetail a{display:inline-flex;align-items:center;min-height:44px;margin:10px 0;color:#174ea6;font-weight:700}
body.latam-account-panel #actions>.grid>button{min-height:112px;padding:18px 14px;font-size:18px}body.latam-account-panel #actions>.grid>button:before{font-size:29px}
body.latam-account-panel #panel #requestForm.request-shell{border:0;box-shadow:none;padding:0;background:transparent}
body .wrap{width:100%;max-width:1180px;margin:26px auto}body .wrap .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
body .wrap .tile.action{border:1px solid #dbe5f1;box-shadow:0 4px 14px #10244a0b;min-height:100px;padding:20px;border-radius:16px}
body .wrap .tile.action b{font-size:19px;color:#163a66}body .wrap .tile.action span{font-size:14px;line-height:1.5}
body .wrap .row{gap:12px;padding:15px;background:#fbfcff}body .wrap .row .btn{margin:0}
body .wrap .listhead h2{font-size:24px;line-height:1.2}body .wrap .listhead{gap:14px;margin-bottom:18px}
body .wrap .rows>.tile{box-shadow:none;border:1px solid #dbe5f1;padding:20px}body .wrap .rows>.tile img{max-height:280px;width:auto}
body .wrap details summary{cursor:pointer;padding:12px 0;line-height:1.5}body .wrap details p{font-size:14px}
body .wrap .pill{color:#174879;background:#eaf2fc;line-height:1.4}
body .wrap .btn:not(.google):not(.logout){background:#edf3fb;color:#174879;border:1px solid #ceddec}
body.latam .latam-plan-card{display:flex;flex-direction:column;min-width:0}body.latam .latam-plan-card :is(.latam-cta,button){margin-top:auto}
body.latam #latamAccess{max-width:calc(100vw - 24px)}body.latam #latamAccess input{width:100%}
body.latam #latamAccess .latam-auth-links{gap:8px 14px}body.latam #latamAccess #latamGoogleAccess{min-height:44px;border-radius:12px;line-height:1.35;gap:9px}
body .account-footer,body .latam-copyright{text-align:center;width:100%}
@media(max-width:767px){body .address-actions{grid-template-columns:minmax(0,1fr)}body .address-actions>*{grid-column:auto}body .wrap .row{grid-template-columns:minmax(0,1fr)}body .wrap .listhead .btn{flex:0 0 auto}body .wrap .card{padding:18px}body .wrap{padding:0 12px}body.latam-account-panel #actions>.grid>button{min-height:76px}body .address-status{max-width:48%;white-space:normal}}
@media(min-width:768px) and (max-width:1099px){body .wrap .row{grid-template-columns:minmax(0,1fr) minmax(0,1.5fr)}body .wrap .row>:nth-child(n+3){grid-column:1/-1}body .wrap .grid{gap:14px}body .address-grid{gap:18px}}
@media(prefers-reduced-motion:reduce){body :is(button,a.button,a.btn){transition:none;transform:none}}

/* Readable request details on the white panel surface, regardless of LATAM dark card styles. */
body.latam-account-panel #requestDetail.card{background:#fff!important;color:#172b4d!important}
body.latam-account-panel #requestDetail.card :is(p,div,span,small,li,dd,dt,label){color:#172b4d!important}
body.latam-account-panel #requestDetail.card :is(h1,h2,h3,h4,strong,b){color:#10243e!important}
body.latam-account-panel #requestDetail.card .muted{color:#42566f!important}

/* Card statistics stay legible on both light and dark account presentations. */
body .address-card .analytics-summary{background:#f1f6fc;color:#142c4b;border:1px solid #c3d3e6;border-radius:12px;padding:14px;margin:14px 0 0;min-width:0;text-align:left;font-size:14px;line-height:1.45}
body .address-card .analytics-summary :is(h4,h5,p,strong,small,summary,li,time){color:#142c4b!important}
body .address-card .analytics-summary h4{font-size:17px;margin:0 0 2px;font-weight:800}
body .address-card .analytics-summary h5{font-size:14px;margin:12px 0 6px}
body .address-card .analytics-summary .analytics-period{font-size:12px;margin:0 0 10px}
body .address-card .analytics-metrics{display:flex;flex-wrap:wrap;gap:12px 24px}
body .address-card .analytics-metrics p{flex:1 1 135px;margin:0;font-size:13px}
body .address-card .analytics-metrics strong{display:block;font-size:22px;line-height:1.25;margin-top:4px;overflow-wrap:anywhere}
body .address-card .analytics-summary small{display:block;font-size:11px;margin-top:10px}
body .address-card .analytics-summary summary{font-weight:750;cursor:pointer;padding:10px 0;min-height:40px}
body .address-card .analytics-summary ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}
body .address-card .analytics-daily-chart li>div{height:9px;background:#dbe6f4;border-radius:4px;overflow:hidden;margin:3px 0 6px}
body .address-card .analytics-daily-chart span{display:block;height:100%;background:#1769aa}
`;
