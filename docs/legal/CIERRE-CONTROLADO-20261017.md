# Cierre legal controlado — 17 de octubre de 2026

Estado: **implementación parcial en rama aislada, bloqueada para fusión y despliegue**. Seguimiento #99; documentos fuente PR #100. No es «Legal operativo» ni un PR apto para producción.

## Cambios y comparación

| Archivos | Antes | Propuesta de revisión |
| --- | --- | --- |
| `docs/legal/borradores/*` | Transcripciones PR #100 | Conservadas sin modificación; no se dispone de los PDF binarios para un cotejo visual final |
| `docs/legal/reconciliados/*` | No existían | Cuatro textos completos derivados de las transcripciones, marca e identidad distinguidas, edad 18, decisiones de activación/revisión, privacidad, renovación voluntaria y código/URL/QR permanentes. Datos desconocidos conservados como marcadores y NO PUBLICAR |
| `docs/legal/decisiones-aprobadas-20261017.md`, `revision-final-correcciones.md` | Revisión ADMIN universal y buzón por crear | Reglas vigentes por plan; alias creado según propietario, pruebas de correo pendientes |
| `core/runtime/legal.ts`, `legal-content.json` | Sin conjunto completo versionado | Contenido de revisión, cuatro rutas reservadas, aceptación explícita y evidencia normalizada por servidor. Publicación bloqueada explícitamente |
| `core/runtime/user-panel.ts` | Checkbox existente solo en navegador; enlace a modal combinado; texto revisión universal | Reutiliza checkbox obligatorio desmarcado, cuatro enlaces legibles, reinicio al cambiar plan/país, envío de aceptación/versionado, aviso hasta 48 horas solo gratuitos |
| `core/runtime/request-routes.ts` | Cliente podía omitir aceptación | Rechaza ausencia, falsedad o versión incorrecta antes de escribir. Rechaza versión de revisión como documento vigente |
| `core/runtime/request-repository.ts` | Sin evidencia legal | Prepara persistencia en `request_data` y evento `LEGAL_ACCEPTED` en auditoría al enviar; usuario/solicitud/país y texto/versión/hora del servidor, sin nuevas tablas ni migraciones |
| `core/runtime/server.ts` | Sin rutas independientes | Despacho exclusivo `/legal/terms`, `/legal/privacy`, `/legal/commercial`, `/legal/cookies` |
| `core/runtime/latam-presentation.ts`, `index.html` | Modal breve/mezclado | Enlaces independientes al conjunto compartido; diseño general conservado |
| `core/runtime/tests/legal.test.ts`, `consolidated.test.ts` | Sin pruebas específicas | Versiones, consentimiento, bloqueo de publicación incompleta, enlaces y scripts de ambas presentaciones |
| `core/runtime/tests/latam-visual-corrections.test.ts` | Esperaba «Lugar» pero main muestra «Lugar Gratis» | Aserción ajustada al nombre actual, sin cambiar producto ni tarjeta. Fallo reproducido en main |
| `core/runtime/scripts/render-legal-review.ts`, `docs/legal/evidencia/*.html` | Sin vistas completas | Cuatro vistas internas reproducibles para inspección local; no se sirven públicamente |

## Advertencia concreta para revisión

**No fusionar esta rama:** `LEGAL_PUBLISHABLE=false` es deliberado. Las rutas legales responden **503** sin mostrar los textos con marcadores. Una solicitud de cliente sin aceptación responde **400**; con versión de revisión responde **503 LEGAL_DOCUMENTS_NOT_READY** antes de persistir. Por tanto esta rama, si se desplegara, bloquearía nuevas solicitudes. No afecta producción mientras permanezca aislada. No activar este conjunto sin completar los textos, enlazar una versión efectiva y repetir pruebas de aceptación/persistencia real.

El parámetro de prueba de `requireLegalAcceptance` permite ensayar la normalización; no hay parámetro HTTP ni variable de entorno que habilite documentos incompletos. La aceptación de esta revisión no constituye un contrato válido. El mecanismo de registro se verificó con PostgreSQL aislado en GitHub Actions #272: usuario/solicitud/país, versión/texto/fecha del servidor y un único evento auditable al reintentar. El contexto de prueba inyecta explícitamente documentos válidos sintéticos; no habilita la publicación real.

## Pruebas ejecutadas

- Bun 1.4.3 local: **138 pass, 1 skip, 3 fail**, 142 pruebas/32 archivos. Las tres fallas requieren PostgreSQL local: arranque sin DDL, suite consolidada e integration preflight. No hay conexión productiva utilizada.
- Suite Legal: **4 pass, 74 aserciones**. Valida cuatro vistas completas, rechazo de consentimiento faltante/falso/string/obsoleto, fecha/texto del servidor, checkbox y enlaces en las presentaciones compartidas.
- Build Bun del servidor correcto.
- Validación de migraciones correcta; ninguna migración modificada.
- Check de preservación legacy correcto; `legacy.ts`, generador, autenticación, R2, pagos y fichas históricas sin cambios.
- `git diff --check` correcto.
- Capturas y verificación visual móvil/tablet/escritorio: **pendientes**. Playwright disponible, navegador ausente; descarga Chromium falló. Las vistas HTML son evidencia de contenido, no sustituyen capturas ni validación visual real.
- GitHub Actions #272, commit `28f4cb185bedfc1d80d0abef9538465b58456693`: **188 pass, 0 fail, 2972 aserciones** con PostgreSQL real aislado. Incluye OAuth simulado, solicitud, aceptación persistente y auditoría idempotente, revisión ADMIN, publicación sintética, QR y preservación histórica. Build y Docker correctos. Referencia: https://github.com/direcciones507/direcciones507/actions/runs/39064232384 . Verificar también la ejecución del último commit del PR.
- OAuth, Mi cuenta, privacidad residencial, borradores, revisión manual e históricos: código protegido preservado y suite aislada en CI aprobada; pruebas reales en producción pendientes. No afirmar pruebas de producción realizadas.

## Bloqueos específicos

1. **Identidad/fiscalidad:** identificación fiscal autorizada para publicación y régimen real de facturación. No derivar identificadores personales. Domicilio genérico aprobado pendiente de suficiencia jurídica. Teléfono oficial para textos no confirmado por este cotejo.
2. **Fuente final:** cotejar las cuatro versiones corregidas aprobadas con los PDF originales; esta rama usa las transcripciones disponibles del PR #100. Anexos por país pendientes de validación; no certificarlos.
3. **Privacidad:** tabla real de retención, proveedores/categorías/ubicaciones y canales/autoridades por país. No inventarlos.
4. **Cookies:** inventario observado con nombres, finalidades y duraciones y mecanismo real de preferencias. No se ha implementado un gestor de cookies ni se ha condicionado el servicio a cookies opcionales.
5. **Versionado y tablas:** fecha de vigencia aprobada, versión efectiva, historial y URLs verificadas de planes/precios/disponibilidad. La versión `review.1` no es vigente.
6. **Comercial:** reconciliar promoción vigente de main (desactivación 31-dic) con decisiones históricas distintas antes de tocar beneficios o promociones. No se cambian precios ni promoción operativa. Métodos de pago activos no comprobados, fuera de esta tarea.
7. **Correo:** alias creados según propietario; recepción, respuesta y envío automatizado no probados.
8. **Función protegida:** `request-repository.ts` envía todos los planes a `PENDING_REVIEW`; la decisión exige activación automática de planes pagados tras pago/seguridad. Cambiar esa transición o publicación requiere autorización específica; no se ha cambiado. Permanencia de código/URL/QR depende además del trabajo #101 y necesita pruebas reales.
9. **Validación:** PostgreSQL local y navegador no disponibles en esta sesión; PostgreSQL aislado verificado en CI #272. Completar pruebas visuales responsive, cotejo legal y pruebas reales autorizadas antes del cierre.

## Secuencia para cierre

Completar datos y cotejo documental; sustituir conjunto de revisión por documentos efectivos sin marcadores; autorizar por separado cualquier cambio protegido; validar persistencia con PostgreSQL aislado, rutas con respuesta 200 y formularios de cada plan, pruebas OAuth/privacidad/borradores e históricos; adjuntar capturas; aprobar contenido y diff; solo entonces solicitar autorización expresa de fusión/despliegue. Después verificar producción en ambos dominios para declarar operativo.
