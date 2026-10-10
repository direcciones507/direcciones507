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
