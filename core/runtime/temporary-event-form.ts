/** Dirección Temporal: draft-only form UI. Route integration must enforce authenticated owner and CSRF. */
export function renderTemporaryEventDraftForm(action='/v1/user/temporary-events',paymentsEnabled=false):string {
 if(!/^\/v1\/user\/[a-z0-9/-]+$/.test(action))throw Error('INVALID_FORM_ACTION');
 return `<style>
*{box-sizing:border-box}
body{margin:0;background:#eef3fa;color:#152c4a;font:16px/1.55 system-ui,-apple-system,sans-serif}
.temporary-event-form{max-width:940px;margin:0 auto;padding:32px 18px 64px}
.temporary-event-form h2{font-size:clamp(1.65rem,3vw,2.25rem);letter-spacing:-.035em;margin:12px 0}
.temporary-event-form>p{color:#52677f;max-width:68ch}
.temporary-event-form form{display:grid;gap:14px}
.temporary-event-form fieldset{border:1px solid #e0e8f3;border-radius:22px;padding:20px 24px 24px;background:#fff;margin:0;min-width:0;box-shadow:0 7px 28px rgba(20,48,86,.045)}.temporary-event-form .event-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 20px;align-items:start}
.temporary-event-form legend{font-size:1.13rem;font-weight:750;letter-spacing:-.02em;padding:0 12px;color:#17375e;line-height:1.4;max-width:100%}
.temporary-event-form label{display:block;min-width:0;font-weight:570;color:#203b5c}
.temporary-event-form input:not([type=checkbox]):not([type=file]),.temporary-event-form textarea{display:block;width:100%;font:inherit;color:#183554;background:#f8fbff;padding:13px 14px;border:1.5px solid #b9c9de;border-radius:12px;margin-top:8px;min-height:48px;transition:border-color .18s,box-shadow .18s,background .18s}
.temporary-event-form textarea{min-height:112px;resize:vertical}
.temporary-event-form input:hover,.temporary-event-form textarea:hover{border-color:#6198e9}
.temporary-event-form input:focus-visible,.temporary-event-form textarea:focus-visible,.temporary-event-form button:focus-visible,.temporary-event-form a:focus-visible{outline:3px solid #91bfff;outline-offset:3px}
.temporary-event-form input:not([type=checkbox]):not([type=file]):focus,.temporary-event-form textarea:focus{background:#fff;border-color:#1760ce;box-shadow:0 0 0 4px rgba(23,96,206,.12);outline:0}
.temporary-event-form input[type=checkbox]{width:19px;height:19px;accent-color:#1760ce;vertical-align:middle;margin-right:8px;cursor:pointer}
.temporary-event-form input[type=file]{display:block;width:100%;margin-top:9px;padding:12px;border:1.5px dashed #8eadd6;border-radius:14px;background:#f5f9ff;color:#52677f;font:inherit;font-size:.9rem;cursor:pointer;transition:background .18s,border-color .18s,box-shadow .18s}
.temporary-event-form input[type=file]:hover{background:#eaf3ff;border-color:#1760ce}
.temporary-event-form input[type=file]::file-selector-button{background:#1760ce;color:#fff;border:0;border-radius:10px;padding:12px 15px;font:inherit;font-weight:700;margin-right:12px;cursor:pointer;transition:background .18s,transform .18s}
.temporary-event-form input[type=file]:hover::file-selector-button{background:#104ba8}
.temporary-event-form button,.temporary-event-form .event-link{padding:13px 19px;min-height:48px;border:1px solid transparent;border-radius:12px;background:#1760ce;color:#fff;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:6px 0;text-decoration:none;transition:background .18s,box-shadow .18s,transform .18s}
.temporary-event-form button:hover:not(:disabled),.temporary-event-form .event-link:hover{background:#104ba8;box-shadow:0 7px 17px rgba(23,96,206,.2);transform:translateY(-1px)}
.temporary-event-form button:active:not(:disabled){background:#0b3a86;transform:translateY(1px);box-shadow:none}
.temporary-event-form button:disabled{opacity:.5;cursor:not-allowed}
#event-geolocation{background:#e8f1ff;color:#1454b5;border-color:#b7d2fa;justify-self:start}
#event-geolocation:hover{background:#d5e6ff;color:#0c408f}
#temporary-event-error:not(:empty){padding:12px 16px;background:#edf5ff;border-left:4px solid #1760ce;border-radius:10px}
#event-drafts a,.temporary-event-form a{overflow-wrap:anywhere}
#event-after-save{background:#fff;border:1px solid #e0e8f3;border-radius:20px;padding:18px;margin-top:12px;display:grid;gap:10px}#event-after-save>*{margin:0}#event-after-save .event-link,#event-after-save button{width:100%;margin:0}#event-after-save label{margin:0}#event-after-save label input[type=tel]{margin-top:6px}
#event-after-save[hidden]{display:none}
.temporary-event-form iframe{width:100%;height:600px;border:1px solid #a9b8cb}
@media(max-width:650px){.temporary-event-form fieldset{padding:18px 16px}.temporary-event-form .event-field-grid{grid-template-columns:1fr;gap:14px}.temporary-event-form{padding:20px 12px 40px}.temporary-event-form button[type=submit]{width:100%}.temporary-event-form .event-map-group{gap:8px}.temporary-event-form .event-field-grid{gap:10px}.temporary-event-form fieldset{padding:16px}.temporary-event-form input[type=file]::file-selector-button{margin-right:8px;padding:10px}}
@media(prefers-reduced-motion:reduce){.temporary-event-form *, .temporary-event-form *::file-selector-button{transition:none!important;transform:none!important}}
.temporary-event-form .event-map-group{grid-column:1/-1;display:grid;gap:10px}.temporary-event-form .event-coordinates{display:flex;align-items:end;gap:12px;flex-wrap:wrap;padding:12px;border:1px solid #c5d5ec;border-radius:14px;background:#f5f9ff}.temporary-event-form .event-coordinates label{flex:1 1 140px;margin:0}.temporary-event-form .event-coordinates button{flex:0 0 auto;margin:0}.temporary-event-form .event-map{height:310px;border:1px solid #b9c9de;border-radius:16px;overflow:hidden;background:#eaf2fb;z-index:0}.temporary-event-form .event-map-note{color:#52677f;font-size:.9rem;margin:0}.temporary-event-form .event-review-check{display:flex;align-items:center;gap:10px;padding:14px 16px;border:1.5px solid #c7d6ea;border-radius:12px;cursor:pointer;transition:background .18s,border-color .18s,box-shadow .18s}.temporary-event-form .event-review-check:hover{background:#e8f2ff;border-color:#1760ce}.temporary-event-form .event-review-check:has(input:checked){background:#e2f0ff;border-color:#1760ce;box-shadow:0 0 0 2px rgba(23,96,206,.09)}.temporary-event-form .event-review-check input{flex:none}.temporary-event-form #event-drafts a{display:inline-block;padding:7px 12px;background:#fff;border:1px solid #c5d5ec;border-radius:10px;text-decoration:none;color:#1454b5}.temporary-event-form #event-drafts a:hover{background:#e8f2ff}@media(max-width:650px){.temporary-event-form .event-coordinates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px}.temporary-event-form .event-coordinates button{grid-column:1/-1;width:100%}.temporary-event-form .event-map{height:260px}} .temporary-event-form .event-full-row{grid-column:1/-1}.temporary-event-form .event-helper{margin:0;color:#52677f}.temporary-event-form .event-section-heading{grid-column:1/-1;font-size:1.17rem;line-height:1.35;margin:0 0 2px;color:#17375e;font-weight:800}.temporary-event-form fieldset{padding-top:22px}/* required styles */

.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
	position: absolute;
	left: 0;
	top: 0;
	}
.leaflet-container {
	overflow: hidden;
	}
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
	-webkit-user-select: none;
	   -moz-user-select: none;
	        user-select: none;
	  -webkit-user-drag: none;
	}
/* Prevents IE11 from highlighting tiles in blue */
.leaflet-tile::selection {
	background: transparent;
}
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */
.leaflet-safari .leaflet-tile {
	image-rendering: -webkit-optimize-contrast;
	}
/* hack that prevents hw layers "stretching" when loading new tiles */
.leaflet-safari .leaflet-tile-container {
	width: 1600px;
	height: 1600px;
	-webkit-transform-origin: 0 0;
	}
.leaflet-marker-icon,
.leaflet-marker-shadow {
	display: block;
	}
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */
.leaflet-container .leaflet-overlay-pane svg {
	max-width: none !important;
	max-height: none !important;
	}
.leaflet-container .leaflet-marker-pane img,
.leaflet-container .leaflet-shadow-pane img,
.leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer,
.leaflet-container .leaflet-tile {
	max-width: none !important;
	max-height: none !important;
	width: auto;
	padding: 0;
	}

.leaflet-container img.leaflet-tile {
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */
	mix-blend-mode: plus-lighter;
}

.leaflet-container.leaflet-touch-zoom {
	-ms-touch-action: pan-x pan-y;
	touch-action: pan-x pan-y;
	}
.leaflet-container.leaflet-touch-drag {
	-ms-touch-action: pinch-zoom;
	/* Fallback for FF which doesn't support pinch-zoom */
	touch-action: none;
	touch-action: pinch-zoom;
}
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {
	-ms-touch-action: none;
	touch-action: none;
}
.leaflet-container {
	-webkit-tap-highlight-color: transparent;
}
.leaflet-container a {
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);
}
.leaflet-tile {
	filter: inherit;
	visibility: hidden;
	}
.leaflet-tile-loaded {
	visibility: inherit;
	}
.leaflet-zoom-box {
	width: 0;
	height: 0;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	z-index: 800;
	}
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */
.leaflet-overlay-pane svg {
	-moz-user-select: none;
	}

.leaflet-pane         { z-index: 400; }

.leaflet-tile-pane    { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane  { z-index: 500; }
.leaflet-marker-pane  { z-index: 600; }
.leaflet-tooltip-pane   { z-index: 650; }
.leaflet-popup-pane   { z-index: 700; }

.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg    { z-index: 200; }

.leaflet-vml-shape {
	width: 1px;
	height: 1px;
	}
.lvml {
	behavior: url(#default#VML);
	display: inline-block;
	position: absolute;
	}


/* control positioning */

.leaflet-control {
	position: relative;
	z-index: 800;
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}
.leaflet-top,
.leaflet-bottom {
	position: absolute;
	z-index: 1000;
	pointer-events: none;
	}
.leaflet-top {
	top: 0;
	}
.leaflet-right {
	right: 0;
	}
.leaflet-bottom {
	bottom: 0;
	}
.leaflet-left {
	left: 0;
	}
.leaflet-control {
	float: left;
	clear: both;
	}
.leaflet-right .leaflet-control {
	float: right;
	}
.leaflet-top .leaflet-control {
	margin-top: 10px;
	}
.leaflet-bottom .leaflet-control {
	margin-bottom: 10px;
	}
.leaflet-left .leaflet-control {
	margin-left: 10px;
	}
.leaflet-right .leaflet-control {
	margin-right: 10px;
	}


/* zoom and fade animations */

.leaflet-fade-anim .leaflet-popup {
	opacity: 0;
	-webkit-transition: opacity 0.2s linear;
	   -moz-transition: opacity 0.2s linear;
	        transition: opacity 0.2s linear;
	}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
	opacity: 1;
	}
.leaflet-zoom-animated {
	-webkit-transform-origin: 0 0;
	    -ms-transform-origin: 0 0;
	        transform-origin: 0 0;
	}
svg.leaflet-zoom-animated {
	will-change: transform;
}

.leaflet-zoom-anim .leaflet-zoom-animated {
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);
	}
.leaflet-zoom-anim .leaflet-tile,
.leaflet-pan-anim .leaflet-tile {
	-webkit-transition: none;
	   -moz-transition: none;
	        transition: none;
	}

.leaflet-zoom-anim .leaflet-zoom-hide {
	visibility: hidden;
	}


/* cursors */

.leaflet-interactive {
	cursor: pointer;
	}
.leaflet-grab {
	cursor: -webkit-grab;
	cursor:    -moz-grab;
	cursor:         grab;
	}
.leaflet-crosshair,
.leaflet-crosshair .leaflet-interactive {
	cursor: crosshair;
	}
.leaflet-popup-pane,
.leaflet-control {
	cursor: auto;
	}
.leaflet-dragging .leaflet-grab,
.leaflet-dragging .leaflet-grab .leaflet-interactive,
.leaflet-dragging .leaflet-marker-draggable {
	cursor: move;
	cursor: -webkit-grabbing;
	cursor:    -moz-grabbing;
	cursor:         grabbing;
	}

/* marker & overlays interactivity */
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-image-layer,
.leaflet-pane > svg path,
.leaflet-tile-container {
	pointer-events: none;
	}

.leaflet-marker-icon.leaflet-interactive,
.leaflet-image-layer.leaflet-interactive,
.leaflet-pane > svg path.leaflet-interactive,
svg.leaflet-image-layer.leaflet-interactive path {
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}

/* visual tweaks */

.leaflet-container {
	background: #ddd;
	outline-offset: 1px;
	}
.leaflet-container a {
	color: #0078A8;
	}
.leaflet-zoom-box {
	border: 2px dotted #38f;
	background: rgba(255,255,255,0.5);
	}


/* general typography */
.leaflet-container {
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-size: 0.75rem;
	line-height: 1.5;
	}


/* general toolbar styles */

.leaflet-bar {
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);
	border-radius: 4px;
	}
.leaflet-bar a {
	background-color: #fff;
	border-bottom: 1px solid #ccc;
	width: 26px;
	height: 26px;
	line-height: 26px;
	display: block;
	text-align: center;
	text-decoration: none;
	color: black;
	}
.leaflet-bar a,
.leaflet-control-layers-toggle {
	background-position: 50% 50%;
	background-repeat: no-repeat;
	display: block;
	}
.leaflet-bar a:hover,
.leaflet-bar a:focus {
	background-color: #f4f4f4;
	}
.leaflet-bar a:first-child {
	border-top-left-radius: 4px;
	border-top-right-radius: 4px;
	}
.leaflet-bar a:last-child {
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
	border-bottom: none;
	}
.leaflet-bar a.leaflet-disabled {
	cursor: default;
	background-color: #f4f4f4;
	color: #bbb;
	}

.leaflet-touch .leaflet-bar a {
	width: 30px;
	height: 30px;
	line-height: 30px;
	}
.leaflet-touch .leaflet-bar a:first-child {
	border-top-left-radius: 2px;
	border-top-right-radius: 2px;
	}
.leaflet-touch .leaflet-bar a:last-child {
	border-bottom-left-radius: 2px;
	border-bottom-right-radius: 2px;
	}

/* zoom control */

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
	font: bold 18px 'Lucida Console', Monaco, monospace;
	text-indent: 1px;
	}

.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {
	font-size: 22px;
	}


/* layers control */

.leaflet-control-layers {
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);
	background: #fff;
	border-radius: 5px;
	}
.leaflet-control-layers-toggle {
	background-image: url(https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/layers.png);
	width: 36px;
	height: 36px;
	}
.leaflet-retina .leaflet-control-layers-toggle {
	background-image: url(https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/layers-2x.png);
	background-size: 26px 26px;
	}
.leaflet-touch .leaflet-control-layers-toggle {
	width: 44px;
	height: 44px;
	}
.leaflet-control-layers .leaflet-control-layers-list,
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {
	display: none;
	}
.leaflet-control-layers-expanded .leaflet-control-layers-list {
	display: block;
	position: relative;
	}
.leaflet-control-layers-expanded {
	padding: 6px 10px 6px 6px;
	color: #333;
	background: #fff;
	}
.leaflet-control-layers-scrollbar {
	overflow-y: scroll;
	overflow-x: hidden;
	padding-right: 5px;
	}
.leaflet-control-layers-selector {
	margin-top: 2px;
	position: relative;
	top: 1px;
	}
.leaflet-control-layers label {
	display: block;
	font-size: 13px;
	font-size: 1.08333em;
	}
.leaflet-control-layers-separator {
	height: 0;
	border-top: 1px solid #ddd;
	margin: 5px -10px 5px -6px;
	}

/* Default icon URLs */
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */
	background-image: url(https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png);
	}


/* attribution and scale controls */

.leaflet-container .leaflet-control-attribution {
	background: #fff;
	background: rgba(255, 255, 255, 0.8);
	margin: 0;
	}
.leaflet-control-attribution,
.leaflet-control-scale-line {
	padding: 0 5px;
	color: #333;
	line-height: 1.4;
	}
.leaflet-control-attribution a {
	text-decoration: none;
	}
.leaflet-control-attribution a:hover,
.leaflet-control-attribution a:focus {
	text-decoration: underline;
	}
.leaflet-attribution-flag {
	display: inline !important;
	vertical-align: baseline !important;
	width: 1em;
	height: 0.6669em;
	}
.leaflet-left .leaflet-control-scale {
	margin-left: 5px;
	}
.leaflet-bottom .leaflet-control-scale {
	margin-bottom: 5px;
	}
.leaflet-control-scale-line {
	border: 2px solid #777;
	border-top: none;
	line-height: 1.1;
	padding: 2px 5px 1px;
	white-space: nowrap;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	background: rgba(255, 255, 255, 0.8);
	text-shadow: 1px 1px #fff;
	}
.leaflet-control-scale-line:not(:first-child) {
	border-top: 2px solid #777;
	border-bottom: none;
	margin-top: -2px;
	}
.leaflet-control-scale-line:not(:first-child):not(:last-child) {
	border-bottom: 2px solid #777;
	}

.leaflet-touch .leaflet-control-attribution,
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	box-shadow: none;
	}
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	border: 2px solid rgba(0,0,0,0.2);
	background-clip: padding-box;
	}


/* popup */

.leaflet-popup {
	position: absolute;
	text-align: center;
	margin-bottom: 20px;
	}
.leaflet-popup-content-wrapper {
	padding: 1px;
	text-align: left;
	border-radius: 12px;
	}
.leaflet-popup-content {
	margin: 13px 24px 13px 20px;
	line-height: 1.3;
	font-size: 13px;
	font-size: 1.08333em;
	min-height: 1px;
	}
.leaflet-popup-content p {
	margin: 17px 0;
	margin: 1.3em 0;
	}
.leaflet-popup-tip-container {
	width: 40px;
	height: 20px;
	position: absolute;
	left: 50%;
	margin-top: -1px;
	margin-left: -20px;
	overflow: hidden;
	pointer-events: none;
	}
.leaflet-popup-tip {
	width: 17px;
	height: 17px;
	padding: 1px;

	margin: -10px auto 0;
	pointer-events: auto;

	-webkit-transform: rotate(45deg);
	   -moz-transform: rotate(45deg);
	    -ms-transform: rotate(45deg);
	        transform: rotate(45deg);
	}
.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
	background: white;
	color: #333;
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);
	}
.leaflet-container a.leaflet-popup-close-button {
	position: absolute;
	top: 0;
	right: 0;
	border: none;
	text-align: center;
	width: 24px;
	height: 24px;
	font: 16px/24px Tahoma, Verdana, sans-serif;
	color: #757575;
	text-decoration: none;
	background: transparent;
	}
.leaflet-container a.leaflet-popup-close-button:hover,
.leaflet-container a.leaflet-popup-close-button:focus {
	color: #585858;
	}
.leaflet-popup-scrolled {
	overflow: auto;
	}

.leaflet-oldie .leaflet-popup-content-wrapper {
	-ms-zoom: 1;
	}
.leaflet-oldie .leaflet-popup-tip {
	width: 24px;
	margin: 0 auto;

	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);
	}

.leaflet-oldie .leaflet-control-zoom,
.leaflet-oldie .leaflet-control-layers,
.leaflet-oldie .leaflet-popup-content-wrapper,
.leaflet-oldie .leaflet-popup-tip {
	border: 1px solid #999;
	}


/* div icon */

.leaflet-div-icon {
	background: #fff;
	border: 1px solid #666;
	}


/* Tooltip */
/* Base styles for the element that has a tooltip */
.leaflet-tooltip {
	position: absolute;
	padding: 6px;
	background-color: #fff;
	border: 1px solid #fff;
	border-radius: 3px;
	color: #222;
	white-space: nowrap;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	pointer-events: none;
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);
	}
.leaflet-tooltip.leaflet-interactive {
	cursor: pointer;
	pointer-events: auto;
	}
.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	position: absolute;
	pointer-events: none;
	border: 6px solid transparent;
	background: transparent;
	content: "";
	}

/* Directions */

.leaflet-tooltip-bottom {
	margin-top: 6px;
}
.leaflet-tooltip-top {
	margin-top: -6px;
}
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-top:before {
	left: 50%;
	margin-left: -6px;
	}
.leaflet-tooltip-top:before {
	bottom: 0;
	margin-bottom: -12px;
	border-top-color: #fff;
	}
.leaflet-tooltip-bottom:before {
	top: 0;
	margin-top: -12px;
	margin-left: -6px;
	border-bottom-color: #fff;
	}
.leaflet-tooltip-left {
	margin-left: -6px;
}
.leaflet-tooltip-right {
	margin-left: 6px;
}
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	top: 50%;
	margin-top: -6px;
	}
.leaflet-tooltip-left:before {
	right: 0;
	margin-right: -12px;
	border-left-color: #fff;
	}
.leaflet-tooltip-right:before {
	left: 0;
	margin-left: -12px;
	border-right-color: #fff;
	}

/* Printing */

@media print {
	/* Prevent printers from removing background-images of controls. */
	.leaflet-control {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		}
	}

.temporary-event-form .event-map .leaflet-container{width:100%;height:100%}.temporary-event-form .event-map .leaflet-tile{max-width:none!important;max-height:none!important}</style><section class="temporary-event-form" aria-labelledby="temporary-heading">
 <nav id="event-drafts" aria-label="Mis eventos"></nav><h2 id="temporary-heading">Crear Dirección Temporal</h2>
 <p>Publica una fiesta o evento: 1–30 días por US$12.99; 31–60 días por US$19.99. El evento no se publica hasta confirmar el pago.</p>
 <form id="temporary-event-draft" data-action="${action}" novalidate>
 <fieldset aria-label="Información del evento"><div class="event-field-grid"><h3 class="event-section-heading">Información del evento</h3>
 <label>Nombre del evento <input name="title" required minlength="3" maxlength="160" autocomplete="off"></label>
 <label>Descripción <textarea name="description" maxlength="5000"></textarea></label>
 <label>Fecha inicial <input name="startsOn" type="date" required></label>
 <label>Fecha final <input name="endsOn" type="date" required></label>
 <label>Horario <input name="hours" maxlength="400" placeholder="Ej. 6:00 p. m. a 11:00 p. m."></label>
 <label>Zona horaria <input name="timezone" required value="America/Panama"></label>
 </div></fieldset>
 <fieldset aria-label="Ubicación"><div class="event-field-grid"><h3 class="event-section-heading">Ubicación</h3>
 <label>País (código ISO) <input name="countryCode" required maxlength="2" value="PA"></label>
 <label>Provincia <input name="province" required maxlength="120"></label>
 <label>Distrito <input name="district" required maxlength="120"></label>
 <label>Corregimiento <input name="corregimiento" required maxlength="120"></label>
 <label>Referencia <input name="reference" maxlength="300"></label>
 <div class="event-map-group"><strong>Ubicación exacta del evento</strong><p class="event-map-note">Marca el punto exacto en el mapa o usa tu ubicación.</p><div id="event-location-map" class="event-map" role="region" aria-label="Mapa para seleccionar ubicación exacta"></div><div class="event-coordinates"><label>Latitud <input name="latitude" type="number" step="any" min="-90" max="90"></label><label>Longitud <input name="longitude" type="number" step="any" min="-180" max="180"></label><button type="button" id="event-geolocation">Usar mi ubicación</button></div><p id="event-map-status" class="event-map-note" role="status">Haz clic en el mapa para colocar el marcador.</p></div>
 </div></fieldset>
 <fieldset aria-label="Responsable (información privada)"><div class="event-field-grid"><h3 class="event-section-heading">Responsable (información privada)</h3>
 <p class="event-full-row event-helper">Estos datos no aparecerán en la página pública.</p>
 <label>Nombre <input name="responsibleName" required maxlength="160"></label>
 <label>Correo <input name="responsibleEmail" type="email" required maxlength="254"></label>
 <label>Teléfono <input name="responsiblePhone" type="tel" required maxlength="40"></label>
 </div></fieldset>
 <fieldset aria-label="Contacto público opcional"><div class="event-field-grid"><h3 class="event-section-heading">Contacto público opcional</h3>
 <label>Nombre visible <input name="publicContactName" maxlength="160"></label>
 <label>Teléfono visible <input name="publicContactPhone" type="tel" maxlength="40"></label>
 <label class="event-full-row"><input name="publicContactConsent" type="checkbox"> Autorizo publicar estos datos de contacto en la ficha del evento.</label>
 </div></fieldset>
 <fieldset aria-label="Fotografías"><div class="event-field-grid"><h3 class="event-section-heading">Fotografías</h3><label>Foto principal obligatoria<input name="photo1" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Fotografía 2 (opcional)<input name="photo2" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Fotografía 3 (opcional)<input name="photo3" type="file" accept="image/jpeg,image/png,image/webp"></label><p>Hasta 3 fotos, máximo 8 MB cada una. Puedes guardar el borrador antes de subirlas.</p></div></fieldset>
 <p id="temporary-event-error" role="alert" aria-live="polite"></p>
 <button type="submit">Guardar borrador</button>
 </form><section id="event-after-save" hidden><a id="event-preview-link" target="_blank" rel="noopener" class="event-link">Ver vista previa privada</a><p>Revisa la vista previa antes de pagar.</p><p id="event-quote" role="status"></p><label class="event-review-check"><input id="event-reviewed" type="checkbox"> He revisado la vista previa</label><label>Celular Yappy<input id="event-alias" type="tel" inputmode="numeric" maxlength="8"></label><div id="event-pay-container">${paymentsEnabled?'<btn-yappy theme="blue"></btn-yappy>':'<p>Cobros desactivados. Puedes guardar y revisar tu borrador.</p>'}</div><button id="event-state" type="button">Consultar estado</button><p id="event-payment-message" role="status"></p></section></section>`;
}
/** Bind only on authenticated pages; server must independently validate and check session + CSRF. */
export const temporaryEventDraftClientScript=`(() => {
 const form=document.getElementById('temporary-event-draft');if(!form)return;
 const error=document.getElementById('temporary-event-error');let eventId=new URL(location.href).searchParams.get('draft');
 fetch('/v1/user/temporary-events',{cache:'no-store'}).then(r=>r.json()).then(data=>{const list=document.getElementById('event-drafts');for(const e of data.events||[]){const a=document.createElement('a');a.href='/panel/evento/nuevo?draft='+encodeURIComponent(e.id);a.textContent=e.title+' · '+e.status;const p=document.createElement('p');p.append(a);list.append(p)}}).catch(()=>{});
 const ajax={'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'};
 const state=async()=>{if(!eventId)return;const r=await fetch('/v1/user/temporary-events/'+eventId,{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error('No se pudo recuperar el borrador');return {...data.event,quote:data.quote}};
 const mapElement=document.getElementById('event-location-map'),mapStatus=document.getElementById('event-map-status');let eventMap=null,eventMarker=null;
 const setPoint=(lat,lon,move=true)=>{if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;form.elements.latitude.value=lat.toFixed(6);form.elements.longitude.value=lon.toFixed(6);if(mapStatus&&mapStatus.isConnected)mapStatus.textContent='Punto seleccionado: '+lat.toFixed(6)+', '+lon.toFixed(6);if(eventMap&&window.L){if(eventMarker)eventMarker.setLatLng([lat,lon]);else eventMarker=window.L.marker([lat,lon]).addTo(eventMap);if(move)eventMap.setView([lat,lon],Math.max(eventMap.getZoom(),15));}};
 const syncPoint=()=>{const lat=Number(form.elements.latitude.value),lon=Number(form.elements.longitude.value);if(form.elements.latitude.value!==''&&form.elements.longitude.value!==''&&Number.isFinite(lat)&&Number.isFinite(lon))setPoint(lat,lon)};
 form.elements.latitude.addEventListener('change',syncPoint);form.elements.longitude.addEventListener('change',syncPoint);
 const initMap=()=>{if(!window.L||!mapElement||!mapElement.isConnected||eventMap)return;eventMap=window.L.map(mapElement).setView([8.5,-80],7);const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(eventMap);let tileErrors=0;tiles.on('tileerror',()=>{tileErrors++;if(tileErrors===3&&mapStatus&&mapStatus.isConnected)mapStatus.textContent='No se pudieron cargar los mosaicos del mapa. Comprueba tu conexión; las coordenadas siguen disponibles.'});eventMap.on('click',e=>setPoint(e.latlng.lat,e.latlng.lng,false));syncPoint();requestAnimationFrame(()=>{if(eventMap&&mapElement.isConnected)eventMap.invalidateSize(true)});setTimeout(()=>{if(eventMap&&mapElement.isConnected)eventMap.invalidateSize(true)},300);};
 const startMapWhenReady=()=>{initMap();if(eventMap)requestAnimationFrame(()=>eventMap.invalidateSize(true))};
 const mapJs=document.createElement('script');mapJs.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';mapJs.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';mapJs.crossOrigin='anonymous';mapJs.onload=startMapWhenReady;mapJs.onerror=()=>{if(mapStatus&&mapStatus.isConnected)mapStatus.textContent='El mapa no pudo cargar. Puedes introducir las coordenadas o usar tu ubicación.'};document.head.append(mapJs);
 document.getElementById('event-geolocation').onclick=()=>{if(!navigator.geolocation){error.textContent='Ubicación no disponible';return}navigator.geolocation.getCurrentPosition(p=>setPoint(p.coords.latitude,p.coords.longitude),()=>{error.textContent='No se pudo obtener la ubicación. Puedes escribir las coordenadas.'})};
 const updateQuote=()=>{const a=form.elements.startsOn.value,b=form.elements.endsOn.value,n=(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000+1;document.getElementById('event-reviewed').checked=false;document.getElementById('event-quote').textContent=Number.isInteger(n)&&n>=1&&n<=60?n+' días · USD '+(n<=30?'12.99':'19.99'):'Selecciona una vigencia válida de 1 a 60 días.';};
 form.elements.startsOn.addEventListener('change',updateQuote);form.elements.endsOn.addEventListener('change',updateQuote);
 let quoteReady=false,dirty=false;form.addEventListener('input',()=>{dirty=true;quoteReady=false;document.getElementById('event-reviewed').checked=false});
 const after=()=>{dirty=false;updateQuote();quoteReady=false;state().then(e=>{if(dirty)return;const q=e.quote;if(!q)throw Error('No se pudo verificar la cotización');document.getElementById('event-quote').textContent=q.days+' días · '+q.currency+' '+(q.amountCents/100).toFixed(2);quoteReady=true;}).catch(e=>error.textContent=e.message);document.getElementById('event-after-save').hidden=false;document.getElementById('event-preview-link').href='/v1/user/temporary-events/'+eventId+'/preview'};
 document.getElementById('event-state').onclick=async()=>{try{const e=await state();const m=document.getElementById('event-payment-message');m.textContent=e.status==='ACTIVE'?'Pago confirmado. Dirección publicada.':e.status==='EXPIRED'?'Evento finalizado.':'Estado: '+e.status;if(e.status==='ACTIVE'){const a=document.createElement('a');a.href='/evento/'+e.slug;a.textContent=' Abrir evento';m.append(a)}}catch(e){error.textContent=e.message}};
 if(eventId)state().then(e=>{const fields={title:'title',description:'description',responsibleName:'responsible_name',responsibleEmail:'responsible_email',responsiblePhone:'responsible_phone',countryCode:'country_code',province:'region',district:'municipality',corregimiento:'locality',reference:'reference',latitude:'latitude',longitude:'longitude',startsOn:'starts_on',endsOn:'ends_on',timezone:'event_timezone',hours:'hours_description',publicContactName:'public_contact_name',publicContactPhone:'public_contact_phone'};for(const [k,v]of Object.entries(fields))form.elements[k].value=e[v]??'';form.elements.publicContactConsent.checked=e.public_contact_consent;syncPoint();after()}).catch(e=>error.textContent=e.message);
 const pay=document.querySelector('btn-yappy');if(pay)pay.addEventListener('eventClick',async()=>{if(!quoteReady||dirty||!eventId||!document.getElementById('event-reviewed').checked){error.textContent='Guarda y revisa la vista previa antes de pagar.';return}try{const r=await fetch('/v1/user/temporary-events/'+eventId+'/payment',{method:'POST',headers:ajax,body:JSON.stringify({alias:document.getElementById('event-alias').value})});const v=await r.json();if(!r.ok)throw Error(v.error);pay.eventPayment({transactionId:v.transactionId,token:v.token,documentName:v.documentName});document.getElementById('event-payment-message').textContent='Confirma en Yappy y consulta el estado.'}catch(e){error.textContent='No se pudo iniciar el pago: '+e.message}});

 form.addEventListener('submit',async ev=>{
  ev.preventDefault();error.textContent='';
  if(!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form).entries());
  const start=Date.parse(String(values.startsOn)+'T00:00:00Z');
  const end=Date.parse(String(values.endsOn)+'T00:00:00Z');
  const days=(end-start)/86400000+1;
  if(!Number.isFinite(days)||days<1||days>60){error.textContent='Selecciona una duración de 1 a 60 días.';return;}
  if((values.publicContactName||values.publicContactPhone)&&!values.publicContactConsent){
   error.textContent='Autoriza el contacto público o deja esos campos vacíos.';return;
  }
  const payload={...values,publicContactConsent:values.publicContactConsent==='on'};
  for(const key of ['latitude','longitude'])payload[key]=values[key]===''?null:Number(values[key]);
  for(const k of ['photo1','photo2','photo3'])delete payload[k];
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try {
   const response=await fetch(eventId?form.dataset.action+'/'+eventId:form.dataset.action,{method:eventId?'PUT':'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'},body:JSON.stringify(payload)});
   if(!response.ok)throw Error('No se pudo guardar el borrador ('+response.status+').');
   const data=await response.json();
   if(typeof data.id!=='string')throw Error('Respuesta de guardado inválida.');
   eventId=data.id;const u=new URL(location.href);u.searchParams.set('draft',eventId);history.replaceState(null,'',u);after();
   for(let slot=1;slot<=3;slot++){const f=form.elements['photo'+slot].files[0];if(!f)continue;const body=new FormData();body.set('slot',String(slot));body.set('photo',f);const result=await fetch('/v1/user/temporary-events/'+eventId+'/photos',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'},body});if(!result.ok)throw Error('Borrador guardado; no se pudo subir la fotografía '+slot+'. Puedes reintentar.');form.elements['photo'+slot].value=''}
   error.textContent='Borrador guardado. Continúa con las fotografías y la vista previa.';
   form.dispatchEvent(new CustomEvent('temporary-event:saved',{bubbles:true,detail:{id:data.id}}));
  }catch(e){error.textContent=e instanceof Error?e.message:'Error de conexión';}
  finally{button.disabled=false;}
 });
})();`;
