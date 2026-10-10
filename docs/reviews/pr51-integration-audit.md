# PR #51 — integración y cierre operativo

Fecha: 2026-10-10. Base revisada: `f560c8fa790f981497de02180f578c014c6d9802`; rama `feat/r2-storage-adapter-20261010`, PR base `feat/admin-ui-20261006`.

## Dictamen

**El cierre operativo no está completo.** El incremento implementa almacenamiento privado seguro y asociación recuperable sobre las tablas canónicas, con pruebas aisladas. No habilita solicitudes, aprobación, publicación ni cargas reales. CI verde valida este incremento; no certifica el recorrido pendiente.

## Auditoría y duplicaciones

Se revisaron README, documentos de arquitectura/runbooks/reviews, migraciones 0000–0005, PR #51, autenticación, formularios, administración, repositorios PostgreSQL, plantilla y publicador existente.

| Componente | Evidencia / decisión |
| --- | --- |
| `server.ts`, `general-auth.ts` | Entrada e identidad canónicas. Se conservan sin crear otra autenticación ni administrador. |
| `user-panel.ts` | Formulario y lecturas por propietario. Envío permanece deshabilitado. Textos Lugar corregidos a exactamente una foto. |
| `panel-preparation.ts`, `request-validation.ts` | Reutilizados. La nueva frontera de archivos calcula cuotas desde partes reales, ignorando cantidades declaradas. |
| `storeOptimized` / `storePrivate` | Unificados: son la misma función, no dos cargadores. Ambos procesan y almacenan WebP privado. |
| `ad507.address_media`, `address_ownership`, `audit_log` | Reutilizados para intención durable, permisos y auditoría. No se agregó ninguna tabla o migración. |
| `core/postgres/shadow-runtime.ts` | Conserva rutas propias; no se conecta el flujo nuevo al shadow. |
| `place-create-repository.ts` | Creador PLACE preparatorio desconectado. No se convirtió en un segundo creador general. |
| `publication-repository.ts` | Describe ACTIVE; no publica ni reserva códigos. |
| `.github/workflows/generate.yml` | Publicador canónico Apps Script → plantilla → páginas. Permanece intacto. |

Incompatibilidades pendientes:

- `generatePlaceCodeCandidate` produce guiones internos que el filtro del workflow actual no acepta.
- UNIQUE en `ad507.addresses` solo protege esa tabla; no reserva códigos contra el Excel/Apps Script anterior.
- No se encontró la fuente/contrato del asignador canónico anterior dentro del repositorio. No se inventó otro contador.
- No hay implementación integrada de solicitudes idempotentes y aprobación/publicación. `addresses` ya posee DRAFT/PENDING_REVIEW; no duplicar solicitudes en una segunda tabla por comodidad.
- `landline.sql` es una propuesta, no prueba de aplicación en producción.

## Implementación real de este incremento

1. `image-processing.ts`: Sharp 0.34.5 fijado y lock actualizado. Decodifica JPG/PNG/WebP completos; rechaza MIME falso, corrupción, animación, >8 MiB, >16 millones de píxeles o dimensión >8192. Reorienta, reduce a 2048 px y recodifica a WebP sin EXIF/GPS/XMP/ICC.
2. `r2-storage.ts`: un solo cargador; firma privada compartida PUT/GET/DELETE; sin URLs públicas; evita redirecciones; errores de transporte sanitizados; descarga acotada aun sin Content-Length. El bucket exacto y la confirmación explícita de rotación siguen siendo obligatorios.
3. `r2-media-authorization.ts`: autorización ligada al actor autenticado y las tablas existentes. Revalida usuario ACTIVE, CLIENT/ADMIN, propiedad OWNER, estado y asociación del objeto. Otro cliente, Residential y registros antiguos no acceden por este mecanismo. ADMIN puede revisar archivos asociados; no obtiene permisos de carga/borrado por ser ADMIN.
4. `request-media.ts`: composición única PostgreSQL/R2. Bloquea la dirección con FOR UPDATE, revalida permiso, comprueba cuotas, registra archivo y auditoría en una transacción **antes** de PUT. La clave es estable por dirección/rol/contenido optimizado. Reintentos concurrentes conservan una sola asociación y un solo evento.
5. Ante timeout de PUT, se conserva la intención y su storage_key: incluso si R2 recibió el archivo, queda rastreable. Un fallo de registro impide PUT. No se simula atomicidad SQL/R2. El borrado privado es una primitiva; el procedimiento/estado de recuperación, revisión de cargas completas y limpieza final aún deben conectarse al escritor administrativo antes de activar el flujo.
6. `validateRequestFiles`: las cuotas se calculan desde archivos efectivos: Residential cero; Lugar una foto; Gratis/Premium un logo y cero galería; Pro un logo y hasta cinco fotos. El decoder del cargador sigue siendo obligatorio; la inspección de firma no lo sustituye.

Estos módulos aún no se invocan desde rutas de envío reales. No se declara completada la aprobación, publicación o recuperación operativa.

## Archivos modificados

- `core/runtime/package.json`, `bun.lock`
- `core/runtime/panel-preparation.ts`, `request-validation.ts`, `user-panel.ts`, `r2-storage.ts`
- Nuevos: `image-processing.ts`, `r2-media-authorization.ts`, `request-media.ts`
- `core/runtime/tests/request-validation.test.ts`, `consolidated.test.ts`
- Nuevo: `core/runtime/tests/image-processing.test.ts`
- Este informe.

## Verificación

- Bun 1.4.0, instalación frozen-lockfile, validación de seis migraciones y verificación exacta del snapshot legacy.
- Bundles del servidor, adaptador R2 y composición de medios: aprobados.
- Pruebas de JPG/PNG/WebP reales, metadatos privados, corrupción, animación, bombas de píxeles, cuotas de los cinco productos, scopes, stream acotado, reintentos, asociación previa y errores sin revelar detalles upstream.
- Pruebas SQL aisladas de usuarios/roles/propiedad/archivos asociados y persistencia previa a PUT.
- Localmente PGlite valida SQL y el driver real. Dos casos necesitan PostgreSQL nativo: el runner de migraciones usa bases separadas (PGlite comparte instancia) y la concurrencia transaccional de conexiones (limitación del multiplexor PGlite). No se cambió ni omitió ningún caso en la suite comprometida; CI ejecuta la suite completa en PostgreSQL 18.1.
- El resultado de GitHub Actions y el SHA exacto se registran en el cuerpo del PR después de ejecutarse; no inferir aprobación por resultados del SHA anterior.

No confundir concurrencia de archivos/intent con unicidad global de códigos AD507: esta última sigue bloqueada.

## Recursos reales observados (solo lectura)

Railway: `amused-enchantment` / production `909fdec4-8930-4405-ae53-6e8fb0d3f901`. Core, PostgreSQL, shadow y n8n: SUCCESS; sin cambios staged. Core conserva rama `feat/admin-ui-20261006`, deployment `e43bec48-2518-41bc-814a-a99da78eb6c4`.

La conexión entrega nombres de variables, no valores (`valuesRedacted=true`). No se obtuvo acceso SQL al esquema/ledger vivo. Las cuatro variables R2 están nombradas; `AD507_R2_CREDENTIAL_ROTATION_CONFIRMED` no figura. No se comprobó en Cloudflare la revocación, privacidad o permisos del bucket. No se configuró el indicador ni se contactó R2.

## Bloqueos para completar el recorrido

1. Introspección SQL de solo lectura: columnas, constraints, índices y ledger reales de `ad507`, sin registros privados. Ninguna escritura de producción antes de esa verificación.
2. Evidencia de revocación de la credencial R2 expuesta y reemplazo limitado al bucket privado existente. No enviar claves por chat/PR.
3. Fuente y contrato de reserva del asignador AD507 anterior; garantía de unicidad entre ambas fuentes.
4. Incorporar las altas PostgreSQL aprobadas al publicador existente, preservando formato, resolución de datos, páginas antiguas y Residential/OWNER. No basta agregar códigos al listado si la ficha todavía consulta datos antiguos.
5. Integrar escritor de solicitudes, idempotencia, campos completos de formulario, revisión de archivos completos, estados, rechazo/aprobación y recuperación durable. No establecer ACTIVE como sustituto de publicar.

## Pruebas físicas pendientes

- [ ] Android/tablet/iPhone: Google/login/logout y permisos CLIENT/ADMIN.
- [ ] Recorrido completo de Residential, Lugar, Gratis, Premium y Pro.
- [ ] Persistencia después de recarga y reintento de solicitud.
- [ ] R2 real privado: autorización, aislamiento, procesamiento y recuperación de fallos.
- [ ] ADMIN revisa datos/archivos, rechaza/aprueba; cliente no publica.
- [ ] Reserva de códigos concurrente contra la autoridad anterior.
- [ ] Publicación canónica; enlaces, QR y datos de direcciones anteriores intactos.
- [ ] Residential OWNER/PIN e invitados mediante el proceso existente.

Migración posterior individual: capturar ficha/código/enlace/QR y respaldo; validar destino y reserva; comparar campo por campo; aprobar una sola dirección; conservar reversión de su autoridad de lectura. No ejecutar migración masiva ni registrar la misma alta en ambos sistemas.

## Producción

Sin merge ni despliegue. Sin escrituras SQL reales, cargas/borrados R2, cambios de variables, credenciales, Excel, Apps Script, DNS/Namecheap, páginas, clientes o QR. Producción conserva su configuración y despliegue observados. PR #51 permanece en borrador y no está listo para cierre operativo.

## Bloque 2 — preparación implementada (10 octubre 2026)

Actualiza el bloqueo 5 anterior: escritor, formulario multipart, idempotencia, revisión, aprobación/rechazo y recuperación están implementados. El cierre operativo sigue pendiente de esquema vivo y proveedor canónico verificado de reserva/publicación.

- `request-repository.ts` reutiliza usuarios, roles, planes, direcciones, propietarios, redes, medios y auditoría existentes; no crea tablas ni asignador. DRAFT → PENDING_REVIEW → ARCHIVED (rechazo), o PENDING_REVIEW aprobada → ACTIVE solo tras confirmación del publicador. Campos base en columnas canónicas; extras asociados a la misma solicitud.
- `request-routes.ts`, `server.ts`, `request-admin-ui.ts`: ruta de solicitudes existente y operaciones del administrador existente; autenticación, autorización vigente, origen, límites multipart, rate limit y errores sanitizados. No crea un segundo panel.
- `user-panel.ts`, `request-validation.ts`: formulario y campos del cliente conectados; idempotencia por usuario/clave/huella, conflictos explícitos y transacciones con locks PostgreSQL.
- `request-media.ts`, `r2-storage.ts`: reutilizan procesamiento y adaptador anteriores; añaden PENDING/READY durable para impedir aprobación tras PUT fallido. Asociación previa y recuperación sin borrar enlaces inciertos. Duplicados equivalentes se rechazan antes de insertar.
- `schema-proposals/requests.sql`: propuesta transaccional/repetible, solo probada en base aislada; mantiene UNIQUE y permite códigos NULL únicamente para solicitudes nuevas. No está en el runner ni se aplica al iniciar. `landline.sql` admite repetición segura, sin backfill ni reemplazo del validador anterior.
- `tests/consolidated.test.ts`: cinco productos, permisos, persistencia, duplicados, aprobación/rechazo, PUT fallido, recuperación, concurrencia, colisión histórica y reintentos de publicación. R2 y proveedor canónico son fixtures simulados; no validan autoridades reales.

### Autoridad histórica

Lectura limitada del máster real `AD507_MASTER_PANAMA_PLANES_2026`, pestaña `direcciones`: A3:A2008 contiene 40 códigos no vacíos, sin duplicados en ese rango. A3:A8 muestra códigos numéricos derivados de `CONCAT("AD507-";TEXT(ROW()-2;"0000"))` y un código nominal manual. La posición de fila no garantiza reserva concurrente ni cobertura de todas las fuentes. Los 2000 códigos de `codes.json` no prueban asignaciones históricas. No se editó el máster ni Apps Script; no se obtuvo el script vinculado.

Runtime mantiene `canonical:null`. La interfaz exige registro histórico verificado, reserva idempotente por ID y publicación confirmada con comprobante. Conserva el código reservado si falla publicación y serializa reintentos con conexión reservada/lock. UNIQUE protege códigos presentes en PostgreSQL, sin sustituir garantía global del proveedor anterior. No se implementó un contador alternativo ni se alteró el workflow de generación.

### Reversión y pruebas pendientes

Antes de aplicar SQL: introspectar esquema/ledger vivo, respaldo, comparación de constraints, prueba en copia y incorporación al runner existente. Reversión de aplicación: cerrar solicitudes, volver a versión anterior y conservar columnas/datos/auditorías/enlaces para recuperación. Restaurar `code NOT NULL` solo tras comprobar cero NULL; si existen, detener ese DDL sin inventar códigos ni borrar solicitudes. Un fallo antes de COMMIT revierte la propuesta íntegra.

Local: 53 pruebas aprobadas, cero fallos, 658 assertions en PGlite con driver PostgreSQL. Tres casos requieren PostgreSQL nativo (runner en bases independientes y concurrencia de archivos/solicitudes); permanecen completos en CI. Bundle Bun aprobado. CI prueba suite íntegra, PostgreSQL 18.1 y Docker; resultado del SHA final en PR.

`REQUEST_WORKFLOW_ENABLED=false` mantiene rutas/botones cerrados, sin variable para activar solicitudes. Pendientes: esquema vivo, registro histórico completo, contrato/código del asignador-publicador anterior, revocación R2 comprobada y pruebas físicas listadas arriba. Producción no recibió escrituras, cargas, despliegue, merge ni cambios de configuración.

## Bloque 3 — comprobación real y preparación de cierre (10 octubre 2026)

### Cuatro verificaciones críticas

| Verificación | Evidencia real | Estado y límite |
| --- | --- | --- |
| PostgreSQL canónico | Railway Postgres SUCCESS; proxy existente activo. `/ready` real HTTP 200 con database/authConfigured true. | Conectividad y readiness de identidad verificadas; columnas, FK, índices y ledger vivo aún no inspeccionados. OAuth Railway devuelve nombres con valuesRedacted=true, sin credencial SQL. |
| Registro/asignador AD507 | Máster A3:A2008: 40 códigos no vacíos, sin colisiones al normalizar; mayor numérico 0038. A3:A42 conserva fórmulas basadas en ROW()-2 y nombres manuales. | No acredita el último consecutivo reservado ni todas las fuentes históricas. Las filas 39/40 usan nombres; no inferir que 0039 esté libre. Fuente/LockService/contrato de reserva de Apps Script no accesibles; asignación real bloqueada. |
| Publicador | index y auto-sync consultan un Apps Script que responde 23 códigos, mayor numérico 0035; generate.yml consulta otro que responde 40, mayor 0038. Ambos HTTP 200 y JSON válidos. Fonda Tatiana pública HTTP 200, HTML con referencias QR. | Publicador general de GitHub Pages y lector dinámico identificados. Listados diferentes pueden corresponder a filtros/versiones; no se sustituyeron endpoints ni se disparó generación. No hay contrato verificado para consumir solicitudes PostgreSQL/R2 nuevas. Publicación nueva bloqueada. |
| R2 | Core mantiene nombres de cuatro variables R2; indicador de rotación no configurado. | Bucket/permisos/revocación no verificables sin acceso Cloudflare; la existencia de variables no demuestra revocación. Sin contacto R2, cargas, borrados ni cambios de secretos. |

Máster: https://docs.google.com/spreadsheets/d/1l0QlB8Y_3qE_SN2KuygiepsAKgxwhFvc53YOrCEd8YQ/edit . La búsqueda Drive de proyectos Apps Script no devuelve resultados; esto no demuestra que el script vinculado no exista. No se leyeron nombres/teléfonos de clientes para estas verificaciones.

### Trabajo implementado y componentes reutilizados

- `core/runtime/scripts/integration-preflight.ts`: comando administrativo manual `sources` o `postgres`; sin rutas públicas, startup, asignador ni publicador alternativos. Descubre URLs en archivos mantenidos, hace únicamente GET action=list, limita tiempo/bytes, resume colisiones normalizadas, mayor numérico y hash del conjunto. Reutiliza `normalizeAd507Code` de `core/postgres/public-address-repository.ts`. Nunca transforma ese mayor código ni la igualdad de fuentes en autorización para asignar/publicar.
- Modo PostgreSQL: conexión dedicada mediante `AD507_AUDIT_DATABASE_URL`, transacción REPEATABLE READ READ ONLY, límites de consulta/lock; consulta catálogo, constraints, índices, versiones/checksums y conteos agregados de códigos. No lee perfiles, PIN, tokens ni credenciales; no expone URL ni errores upstream. Produce huella del esquema para revisar la migración con evidencia exacta cuando exista acceso.
- Propuestas `landline.sql`/`requests.sql`: añaden límites DDL y rechazo explícito de tipos incompatibles antes de mutar. Conservan propuestas pendientes, sin registro automático ni ejecución. No se modificaron migraciones históricas ni el runner existente.
- `tests/integration-preflight.test.ts` y `tests/consolidated.test.ts`: verificación de fuentes, duplicados normalizados, fallos/HTML/body excesivo, lectura SQL, repetición de propuestas conservando códigos, READ ONLY efectivo y rollback ante colisión de tipo.

No se eliminó ni duplicó un publicador. Se detectó divergencia de fuentes y se conservó el funcionamiento histórico hasta verificar sus filtros/contrato. `core/postgres/publication-handler.ts` es metadata de lectura futura, no un escritor/publicador ya conectado; no se confundió con publicación real.

### Verificación ejecutada

- Lectura real Máster y fórmulas; ambas fuentes Apps Script HTTP 200; preflight sources ejecutado contra esas fuentes definitivas (23 y 40, hashes diferentes, cero duplicados internos).
- Core real /health y /ready HTTP 200; /v1/admin/requests y /v1/user/panel anónimos HTTP 401. No se inició OAuth ni se creó sesión de cliente de prueba.
- Ficha histórica Fonda Tatiana HTTP 200. Referencia QR presente no demuestra escaneo físico, propietario ni funcionamiento de imágenes; esas pruebas permanecen pendientes. La ruta residencial 0001 devolvió 404 en lectura sin sesión; no se alteró ni se diagnosticó como regresión únicamente por esa respuesta.
- Local: cuatro pruebas de preflight aprobadas, cero fallos, 29 assertions; seis migraciones originales validadas, snapshot legacy exacto y bundle Bun aprobados. Suite completa PostgreSQL/Docker/CI del SHA final registrada en PR al completar.

### Intervención necesaria del propietario

1. Acceso SQL de solo lectura mediante mecanismo seguro o ejecución del preflight en un contexto ya autenticado, entregando únicamente el informe de esquema. No enviar DATABASE_URL/contraseñas por chat. La conexión OAuth actual no permite introspección ni SSH.
2. Fuente accesible del Apps Script vinculado y versión de deployment activa, reglas/registro de reservas incluyendo aliases históricos y todos los canales. Confirmar cuál contrato de lectura/publicación usa cada listado y cómo una misma reserva sobrevive reintentos.
3. Evidencia Cloudflare de revocación del ID antiguo, reemplazo y permisos limitados al bucket privado; acceso de lectura a configuración/auditoría sin exponer valores de claves. No activar el indicador basándose solamente en variables presentes.
4. Después de resolver accesos: autorización separada para aplicar SQL, integrar/desplegar y publicar una prueba controlada. Nada de eso queda autorizado ni ejecutado en este bloque.

Checklist físico conservado: sesión/permisos Android/tablet/iPhone, cinco planes, recarga/reintentos, R2 privado y fallos, revisión/rechazo/aprobación, reserva concurrente real con autoridad histórica, publicación con enlaces/QR/datos/propietario/medios correctos y compatibilidad Residential OWNER/PIN. No hay prueba nueva de publicación pública ni destructiva con clientes reales.

Producción conserva Core e43bec48-2518-41bc-814a-a99da78eb6c4 y Postgres 86a92993-f580-42d8-9706-61976bd8e03d, sin staged. PR permanece borrador y solicitudes cerradas. No se declara el sistema terminado.

## Bloque 4 — cierre de los bloqueos documentados (10 octubre 2026)

El propietario confirma como autoridad histórica el Máster anterior, ID `1l0QlB8Y_3qE_SN2KuygiepsAKgxwhFvc53YOrCEd8YQ`, pestaña `direcciones`, y señala PLANES como candidato oficial vinculado. Esta confirmación identifica el recurso que debe verificarse; no acredita por sí misma un project ID, deployment ID, versión o contrato de reserva.

### Diferencia 23 / 40: evidencia adicional de solo lectura

Comparación exacta de los conjuntos normalizados: el endpoint de `generate.yml` contiene los mismos 40 códigos que A3:A42 del Máster. La fuente compartida por index/auto-sync es un subconjunto: 23 comunes, cero exclusivos y 17 ausentes. No hay códigos exclusivos de la lista de 23 en estas lecturas; esto no demuestra que ambos deployments pertenezcan al mismo proyecto.

| Metadatos de las respuestas reales | Lista index/auto-sync | Lista generate |
| --- | --- | --- |
| Negocio | 12 | 14 |
| Premium | 9 | 9 |
| Premium Pro | 2 | 2 |
| Residencial | 0 | 7 |
| Persona | 0 | 8 |
| público e indexable explícitos | 23 | Campos ausentes |

Los 23 indican tipo NEGOCIO, `publico=true`, `indexable=true`; 21 declaran compatibilidad LEGACY y dos NUEVO. Los 17 ausentes se clasifican en la lista anterior como siete Residencial, ocho Persona y **dos Negocio**. La lectura acotada de D/AZ del Máster confirma los siete planes Residencial; ocho filas tienen Plan vacío (cuatro con tipo RESIDENCIAL y cuatro sin tipo), y dos tienen Plan Negocio con tipo vacío. Por tanto, hay evidencia de una vista pública y un listado general, pero **la causa de excluir esos dos Negocio sigue sin verificar**: no se atribuye toda la diferencia a privacidad ni se cambian fuentes para compensarla.

Solo se leyeron códigos, encabezados, plan y tipo; sin OWNER/PIN, teléfonos, ubicaciones, datos privados, imágenes ni escrituras. No se usa un listado público como registro completo de reservas ni se infiere un consecutivo libre.

### Cambios seguros realizados

Se amplía el diagnóstico manual existente `integration-preflight.ts`, sin otra ruta/servicio: compara intersección y exclusiones, resume planes y flags públicos con categorías fijas y no imprime códigos ni valores desconocidos del proveedor. Una entrada inválida impide confirmar la comparación. `coverage.verified` acredita únicamente el cálculo de conjuntos válidos; `allocationVerified` y `publicationVerified` siguen siendo false. La prueba adicional cubre un subconjunto público con exclusión de Negocio, normalización, metadatos desconocidos y ausencia de datos de clientes en la salida.

Sin cambios de runtime, adaptador R2, migraciones, tablas, contador, contrato canónico ni workflows de publicación. Se preservan `canonical:null` y solicitudes cerradas. Archivos modificados: este informe, `core/runtime/scripts/integration-preflight.ts` y `core/runtime/tests/integration-preflight.test.ts`.

### Bloqueos restantes y acción específica

1. **PLANES:** el acceso al panel Apps Script desde este navegador redirige a la página informativa sin proyecto abierto; el acceso Google devuelve HTTP 502 con Connection refused incluso tras un único reintento. No es evidencia de inexistencia del script ni de un bloqueo antibot. Hace falta el enlace del **proyecto PLANES vinculado al Máster**, su ID y la pantalla de Administrar implementaciones con deployment ID/versión/URL activos, más acceso de lectura a su fuente sin secretos. Con esa fuente se verificará openById/hoja, acción list/filtros (incluidos los dos Negocio), LockService y reserva/publicación idempotentes. No publicar ni modificar PLANES para obtener esta evidencia.
2. **PostgreSQL:** sigue sin credencial SQL segura disponible (`AD507_AUDIT_DATABASE_URL` ausente); el acceso OAuth conocido solo expone nombres de variables, no SQL ni SSH. Proporcionar acceso de solo lectura por un canal seguro, o ejecutar el comando ya implementado `bun scripts/integration-preflight.ts postgres` dentro de un contexto autenticado y entregar únicamente su JSON sanitizado. No pegar una conexión ni contraseña en chat. La auditoría del esquema vivo no se ejecutó y las propuestas no se aplicaron.
3. **R2:** no hay credencial de auditoría Cloudflare accesible ni evidencia nueva de revocación del ID expuesto. Hace falta comprobante de revocación y reemplazo, fecha/identificador no secreto y permisos limitados al bucket privado `direcciones507-media`, o acceso de lectura a esos metadatos. No sustituir esta prueba por variables configuradas; sin cargas, borrados o cambios de secretos.

La conexión definitiva al asignador/publicador se detiene únicamente por contrato e identidad no verificables. Las garantías y recuperación de solicitudes ya implementadas se conservan, sin contador alternativo. Pendiente probar físicamente reserva concurrente real, recuperación/publicación, enlaces/QR, propietario/OWNER/PIN y archivos privados tras resolver estos accesos y obtener autorización separada para operaciones de producción.

### Pruebas y disposición del PR

Local: cinco pruebas del diagnóstico, cero fallos, 39 assertions; bundle server aprobado y diff sin errores. Diagnóstico real ejecutado: ambos GET action=list exitosos, comparación 23/0/17 y conteos anteriores, sin asignación/publicación. CI previo cb50ec0: Actions #63 SUCCESS, 61 pruebas, cero fallos, 747 assertions con PostgreSQL 18.1 y Docker. El resultado del nuevo SHA se registra en el PR al completar.

PR #51 continúa abierto en borrador, técnicamente preparado para revisar estas comprobaciones y los bloqueos, **no para autorizar todavía la integración de producción**. Sin merge, despliegue, solicitudes públicas, SQL real, cambios históricos, Máster, Apps Script, QR/enlaces, R2, secretos, facturación o DNS.

## Continuación — PLANES oficial y PostgreSQL real (10 octubre 2026)

Esta sección reemplaza el estado de acceso y candidatura de los bloques anteriores. El propietario ha elegido definitivamente PLANES dentro del proyecto Direcciones 507. No se consideran otros scripts como autoridades ni se repiten sus consultas.

### Evidencia real de PLANES

Se abrió el proyecto desde Extensiones → Apps Script del Máster oficial, y se verificó su contenedor en Información general. Project ID: `1A6hGG0gTBwZ6L6yHOqrf9k7Q7KtUa8MonInL3Nmsh8JSG0Bll_n8Tj4Z`. Su título técnico visible es «Proyecto sin título»; la identidad PLANES se acredita por el contenedor y la decisión del propietario. Administrar implementaciones confirma versión **44**, del 1 octubre 2026, deployment `AKfycbwwQ-NbswfDshMBTgFh9ziG-a_nh94PGuPECBsccL1GVSm7TDdbMhVYIXDQUlqIzJSlCQ`, ya referenciado en generate.yml. La fuente actual y la fuente de esa versión coinciden exactamente (Código.gs, 410 líneas). No hubo edición, restauración ni despliegue.

La fuente contiene doGet y acciones list, stats y track. list lee la pestaña direcciones del contenedor activo, admite códigos con expresión `^AD507-[A-Z0-9]+$` y usa Persona cuando el plan está vacío. No filtra por público/indexable. Esto confirma que el listado oficial general de 40 no equivale a la vista pública de 23 ya comparada en el bloque anterior; no se vuelve a consultar ni investigar la otra fuente. La exclusión específica de dos Negocio no se presume resuelta.

**No hay doPost, LockService, reserva, requestId/idempotencia ni inserción de direcciones.** Hay cero activadores visibles. El código de consulta puede añadir encabezados de contadores mediante ensureCounterColumns_; stats/track también tienen efectos de escritura. Por eso únicamente action=list es admisible para el diagnóstico de lectura. PLANES no ofrece actualmente el contrato de reserva/publicación requerido por el nuevo flujo. No se inventaron endpoints ni se conectó un POST supuesto.

### PostgreSQL real: acceso de solo lectura completado

Se utilizó la consola ya autenticada del servicio PostgreSQL Railway, mediante psql local y variables existentes sin leer sus valores. PGOPTIONS impuso default_transaction_read_only=on, statement_timeout=10000 y lock_timeout=2000; cada consulta usó BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY y ROLLBACK. Se consultaron los catálogos y agregados del diagnóstico existente; el CLI TypeScript no se ejecutó porque no se copió una URL de conexión ni se desplegó código. No se obtuvo una huella completa exportable del esquema.

Resultados reales:

- transaction_read_only=on. Las trece tablas requeridas existen, sin incompatibilidades en los tipos de fundamento comprobados.
- Las seis migraciones 0000–0005 constan en schema_migrations y sus checksums coinciden con SHA256 de los archivos del repositorio.
- Faltan exactamente las ocho columnas preparadas: addresses.landline_phone, request_key_hash, request_payload_hash, request_data, review_decision, reviewed_by, publication_receipt; address_media.upload_status. addresses.code sigue NOT NULL.
- addresses contiene **0 registros**, sin códigos nulos, inválidos o duplicados normalizados. El registro histórico del Máster no está importado en esta tabla.
- UNIQUE(code), checks de código/tipo/estado/coordenadas y FK canónicas de propietarios, medios, socials, planes y roles presentes. 481 constraints en ad507, cero sin validar; ese total incluye tablas adicionales que no se tocaron. Índices existentes de código, id, plan y tipo/estado; aún no existen los índices de solicitud propuestos.

Las propuestas landline.sql y requests.sql se conservan pendientes, fuera del runner automático. No se aplicó DDL ni se alteraron datos históricos. UNIQUE de PostgreSQL por sí solo no protege frente a los códigos del Máster.

### Cambios y conexiones conservadas

El diagnóstico manual existente queda limitado al deployment oficial PLANES: identidad/version auditadas, una única lectura action=list, respuesta ok=true obligatoria y ningún fallback a otros scripts. Las referencias históricas index/auto-sync se leen solo como configuración; permanecen sin cambios operativos. allocationVerified y publicationVerified permanecen false. Las pruebas verifican esa exclusividad, fallos cerrados y ausencia de datos de clientes en el informe.

Se reutilizan request-workflow, validación, autorización, tablas canónicas, bloqueo transaccional, reserva persistida y recuperación existentes, así como el adaptador privado R2 y su bloqueo de rotación. No se agregan tablas, rutas, contadores ni publicadores. canonical:null y solicitudes públicas deshabilitadas se mantienen. Archivos de esta continuación: integration-preflight.ts, integration-preflight.test.ts y este informe.

### Bloqueos actuales e intervención exacta

1. **Contrato de escritura ausente en PLANES, comprobado en fuente/version desplegada.** Hace falta autorización específica para adaptar esa misma autoridad histórica: reserva por identificador estable de solicitud, bloqueo compartido con todos los canales, comprobación de todo el registro histórico y aliases, reutilización de la misma reserva en reintentos y publicación que devuelva recibo verificable. No se propone otro contador. El mayor código/listado observado no autoriza asignación. Esta adaptación no se implementa sobre Apps Script ni Máster sin permiso.
2. **SQL pendiente de autorización, ya no de acceso.** Revisar/aprobar la aplicación controlada de las propuestas existentes y su reversión antes de integrar producción. Nada aplicado.
3. **R2 pendiente de comprobación.** El acceso Google elegido para Cloudflare fue ventas@direcciones507.com. La revisión automática rechazó solicitar su contraseña porque exige autorización explícita para esa cuenta. No se reintentó ni se eludió el rechazo. Hace falta confirmar esa cuenta para continuar la auditoría de lectura, y después verificar revocación del identificador expuesto, reemplazo y permisos restringidos al bucket privado. No hay evidencia de rotación; no hubo cargas ni cambios de secretos.

Railway muestra una advertencia de suscripción vencida; los servicios inspeccionados siguen disponibles. No se cambió facturación ni se atribuye a esa advertencia un bloqueo SQL: las consultas funcionaron.

### Validación y disposición

Las pruebas completas y Docker del SHA de esta continuación se registran en el PR al finalizar Actions. Ejecución local de la suite: 38 pass, 1 fallo de inicialización de embedded-postgres por imposibilidad de crear el usuario del sistema, 189 assertions; no es evidencia de aprobación de las pruebas PostgreSQL locales. Las cinco pruebas específicas del diagnóstico pasan. CI utiliza PostgreSQL 18.1 aislado para completar la verificación real del código.

Checklist pendiente, con autorización posterior: migraciones en contexto controlado; reserva concurrente real y reintentos frente a PLANES adaptado; aprobación/rechazo y recuperación de publicación; enlace permanente y escaneo QR; propietario/OWNER/PIN e información histórica conservados; imágenes privadas tras acreditar rotación; cinco planes y permisos desde dispositivos reales. No se sustituyen estas pruebas por fixtures.

PR #51 continúa borrador: preparado para revisión de los cambios seguros, **no para autorizar integración de producción todavía**. No hubo merge, despliegue, habilitación pública, modificación del Máster/Apps Script/direcciones/QR/OWNER/PIN/DNS, migración o escritura productiva, cargas R2, cambio de credenciales o facturación.
