# Cierre visual LATAM: C01–C09

Base confirmada: feat/admin-ui-20261006, 7b7d4c22c51d8d8c967e365edd7f26ce9b5cd295 (PR #54 integrado).
Rama aislada: fix/latam-visual-c01-c09-20261012. Sin merge, despliegue o cambios Railway.

| Punto | Archivo | Corrección | Prueba ejecutada | Resultado |
|---|---|---|---|---|
| C01 | core/runtime/latam-presentation.ts | Menú exactamente Inicio, Países, Planes, Ayuda | Contenido exacto y menú responsive en cinco tamaños | Aprobado |
| C02 | core/runtime/latam-presentation.ts | Ingresar/Crear cuenta solo sin sesión; Mi cuenta/Cerrar sesión autenticado | Sesión invitado, autenticada, sin permiso y HTTP 503 | Aprobado; error visible, sin controles simultáneos |
| C03 | core/runtime/latam-presentation.ts | CTA usa OAuth existente o preparación existente según sesión, permiso y país | Visita simulada a /auth/google/login; apertura formulario; país CO y cuenta sin permiso bloqueados | Aprobado; cero solicitudes/pagos enviados |
| C04 | core/runtime/latam-presentation.ts | commercialCountry fuera de portada; mismo selector disponible en formulario y sincronizado con countryCode | CO↔PA en formulario; nombre conserva datos y envío bloqueado en CO | Aprobado |
| C05 | core/runtime/latam-hero-image.ts y latam-presentation.ts | SVG local 2400×1400 de resolución independiente, mapa iluminado; móvil sin mapa | Carga en Chromium, inspección visual y ausencia de recursos externos en SVG | Aprobado; recurso ≈50 KB antes de base64 |
| C06 | core/runtime/latam-presentation.ts | Cinco tarjetas oscuras con nombres existentes | Residencial/Lugar abren tipo existente; Gratis/Premium/Pro seleccionan plan existente | Aprobado; precios/beneficios/políticas sin cambios |
| C07 | core/runtime/latam-presentation.ts | Único widget flotante; Ayuda abre el widget, sin segundo botón | Apertura/cierre Natalie y conteo de controles | Aprobado localmente; conversación real pendiente |
| C08 | core/runtime/latam-presentation.ts | Login repetido eliminado de portada; preparación usa formulario conservado en diálogo | Ningún Google/Mi panel duplicado visible; loading/error conservados; error de formulario visible en diálogo | Aprobado |
| C09 | core/runtime/latam-presentation.ts | Sin enlace público /panel#addresses | Ausencia de enlace; sección de direcciones conservada en userPanelHtml | Aprobado |

## Evidencia
- 30 pruebas aprobadas, 364 aserciones, cinco archivos de tests. Se añadieron cuatro pruebas específicas en core/runtime/tests/latam-visual-corrections.test.ts.
- Chromium/Playwright: escritorio 1440×1000; tableta vertical 768×1024; horizontal 1024×768; móvil 390×844 y móvil pequeño 320×740.
- Veinte combinaciones tamaño/estado (invitado, autenticado habilitado, autenticado sin permiso y error de sesión). Sin desbordamientos horizontales ni errores JavaScript. No POST productivo, solicitudes ni conversaciones reales.
- Capturas completas con/sin sesión de los cinco tamaños en paquete de entrega, junto con qa-results.json.
- Comparación byte a byte: userPanelHtml y commercialEntryHtml de Panamá (PA y CO) idénticos a la base integrada. user-panel.ts, index.html y país/políticas no modificados. Mis direcciones continúa en el panel autenticado /panel.
- SVG compilado como recurso local desde contornos Natural Earth/world-atlas. Atribución/licencia ISC incluida en módulo; sin dependencia nueva en package.json ni recursos externos de carga.

## Límite de validación
OAuth se probó mediante navegación al endpoint existente con sesión simulada; no login Google real. Natalie se abrió sin enviar conversaciones. Pruebas físicas de OAuth, conversación Natalie y operación comercial corresponden a un despliegue posterior autorizado. CI remoto se comprobará en el PR. Este trabajo no autoriza merge ni deploy.
