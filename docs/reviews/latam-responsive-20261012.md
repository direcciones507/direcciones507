# Direcciones LATAM — diseño responsive preparado

Base: PR #43, feat/admin-ui-20261006, 4b98ec245b51b2fed9b4fe8148ba33a61fff6aeb.
Rama aislada: feat/latam-responsive-20261012. La base despliega automáticamente en Railway; este trabajo no actualiza esa rama, no fusiona ni despliega.

Archivos: commercial-entry.ts (bienvenida LATAM), user-panel.ts (presentación solo internacional), latam-presentation.ts (HTML/CSS responsive), latam-hero-image.ts (mapa extraído de referencia, WebP 14 KB, blob local compatible con CSP existente), tests/commercial-entry.test.ts (expectativa visual) y este reporte.

Reutilizados: formulario compartido, configuración COUNTRIES/INITIAL_COUNTRIES y selección sin borrar datos, panel, login Google, rutas OAuth, permisos y gates, widget Natalie original extraído de index.html. Sin empaquetador Claude ni dependencias productivas nuevas. Directorio abre el listado existente /panel#addresses; no se inventa un directorio público LATAM. Los países extranjeros conservan el estado en preparación.

Validación: 26 pruebas aprobadas, 339 aserciones (commercial-entry, country-configuration, panel-preparation, commercial-release-review). Chromium/Playwright en 1440×1000, 768×1024, 1024×768, 390×844 y 320×740: fondo rgb(7,19,33), mapa cargado, sin overflow horizontal ni errores JavaScript; selector CO/PA sincroniza countryCode y URL. Capturas revisadas visualmente.

Con sesión simulada: CTA abre formulario existente para usuario con permisos; invitado llega al acceso Google. Menú móvil y Natalie se abren. Ingresar/Crear cuenta usan /auth/google/login; Mi cuenta /panel. No se crearon solicitudes, pagos ni conversaciones reales.

Comparación byte a byte contra base: userPanelHtml y entrada comercial Panamá (PA y CO) idénticos. index.html y homepage histórica sin cambios. Core, SQL, OAuth, DNS, secretos, planes y precios sin modificaciones.

Pendiente: CI remoto y prueba física posterior a integración/despliegue autorizado (Google real, Mi cuenta, conversación Natalie). Estas pruebas aisladas no certifican estado productivo del panel ni habilitación comercial extranjera. Capturas de escritorio, tabletas y móviles disponibles en paquete de entrega.
