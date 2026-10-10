# PR #51 — auditoría de integración definitiva

Referencia auditada: `0e211e8634eeffc06266f3fe5d8929903b786773`, base `5a0682ba162f440639b3dd2db14430c712ad3c9a`. Fecha: 2026-10-10.

## Dictamen

Integración incompleta. No habilitar solicitudes reales, aprobar merge o desplegar con este diagnóstico. El PR contiene preparación y un adaptador privado, no el recorrido completo solicitado.

## Evidencia por componente

| Componente existente | Estado comprobado | Conexión pendiente |
| --- | --- | --- |
| `core/runtime/general-auth.ts` | Google, sesiones PostgreSQL, roles, revocación y control de origen implementados | Prueba física del usuario/administrador; no reimplementar identidad |
| `core/runtime/server.ts` | Entrada canónica; conserva extensión anterior, panel y consultas ADMIN | Administración no tiene una acción de aprobación de solicitudes nuevas |
| `core/runtime/user-panel.ts` | Formulario/previsualización y lecturas por propietario | `USER_PANEL_SUBMISSION_ENABLED=false`; `/v1/user/requests` devuelve 503 para todo método; no hay escritor activo |
| `request-validation.ts` / `panel-preparation.ts` | Contratos de datos, teléfonos y cantidades por tipo/plan | Conectar al servidor; validar cantidades de archivos efectivamente procesados, no números declarados por el cliente |
| `r2-storage.ts` | Firma SigV4 y PUT privado con filtro de firmas de imagen | No decodifica/recodifica, no GET autorizado, no DELETE/limpieza ni asociación transaccional |
| `PreparedMediaStorage.storeOptimized` | Interfaz preparatoria | No implementación. `storePrivate` es otro contrato; aún no están unificados |
| `db/migrations/0000..0005` | Esquema canónico versionado presente en repositorio | No se pudo comparar contra la base viva ni comprobar su ledger desde esta sesión |
| `core/runtime/schema-proposals/landline.sql` | Propuesta sin registrar | No es una migración aplicada; `place-create-repository.ts` ya espera `landline_phone` |
| `place-create-repository.ts` | Creador de borradores PLACE con UNIQUE y reintentos | No es creador general ni controla idempotencia de solicitudes; no está conectado a `server.ts` |
| `place-moderation-repository.ts` | Transición de estado PLACE con estado esperado | No conecta la aprobación administrativa general ni la publicación pública |
| `publication-repository.ts` | Consulta de metadatos de registros ACTIVE | No es un publicador ni un asignador de códigos |
| `.github/workflows/generate.yml` | Publicador existente: lista Apps Script → plantilla → páginas | No ingiere altas aprobadas de PostgreSQL |

## Duplicaciones e incompatibilidades

- `core/postgres/shadow-runtime.ts` conserva rutas OAuth y comprobación ADMIN propias; `core/runtime/server.ts` con `general-auth.ts` es el arranque canónico. No conectar el flujo nuevo al shadow ni crear otro panel.
- `storeOptimized` es una interfaz y `storePrivate` un adaptador aún no conectado; son contratos solapados, no dos flujos de carga activos. No se afirma que estén corregidos/unificados.
- `generatePlaceCodeCandidate` produce `AD507-<slug>-<sufijo>`. El publicador actual filtra `^AD507-[A-Z0-9]+$`, que excluye los guiones internos. Conectar ambos sin resolver ese contrato descartaría códigos nuevos.
- El UNIQUE de `ad507.addresses.code` evita colisiones en esa tabla, pero por sí solo no reserva códigos contra el listado/maestro anterior. No inventar un contador independiente. El código del asignador del sistema anterior no está incluido en este repositorio; hay que identificar su autoridad y su reserva antes de garantizar unicidad entre sistemas.
- No se encontró tabla de solicitudes idempotentes en las migraciones revisadas. `addresses` ya conserva DRAFT/PENDING_REVIEW; la decisión de persistencia debe ampliar la arquitectura canónica, sin registrar la misma solicitud simultáneamente en dos sistemas.

## Servicio real observado (solo lectura)

Railway `amused-enchantment` / `production`: `ad507-core`, PostgreSQL y shadow en SUCCESS; sin cambios pendientes. El Core despliega `direcciones507/direcciones507`, rama `feat/admin-ui-20261006`, raíz `/core/runtime`, comando `bun server.ts`. No utiliza la rama del PR #51. El último deployment observado del Core fue `e43bec48-2518-41bc-814a-a99da78eb6c4`.

R2 tiene los cuatro nombres de variables configurados. Eso no confirma valores, bucket privado, permisos, revocación o rotación. La conexión Railway entrega nombres de variables pero oculta valores (`valuesRedacted=true`); no hay acceso SQL de lectura disponible aquí. El esquema vivo y el ledger quedan **no verificados**, no aprobados por inferencia.

## Corrección segura incorporada

`r2Settings` exige `AD507_R2_CREDENTIAL_ROTATION_CONFIRMED=true` y el bucket exacto `direcciones507-media`. La construcción directa del adaptador también rechaza ausencia de confirmación u otro bucket. No se configuró esa variable, no se modificaron credenciales y no se contactó R2. Este indicador debe establecerlo un operador después de verificar revocación de la credencial expuesta y su reemplazo; no es una comprobación automática de Cloudflare ni debe autocompletarse.

Pruebas locales con Bun 1.4.0: 13/13 para R2 y política de medios, incluyendo rotación ausente/falsa, otro bucket y construcción directa. Bundle del adaptador aprobado. Sin cargas ni datos reales. El chequeo CI del PR debe comprobarse para el SHA resultante; CI verde no certifica el flujo completo ausente.

## Recursos y decisiones necesarios para completar una única arquitectura

1. Evidencia de rotación R2: credencial expuesta revocada, reemplazo autorizado para el bucket privado existente. No enviar claves en el PR ni en mensajes.
2. Acceso de introspección SQL de solo lectura o salida redacted de columnas/constraints/ledger de `ad507`, para contrastar las migraciones reales; no requiere copiar registros de clientes.
3. Fuente del asignador canónico AD507 anterior y contrato de reserva/consulta. No reemplazarlo con otro contador ni asumir que UNIQUE en una base evita colisiones con el maestro.
4. Resolver en el publicador existente la incorporación de registros PostgreSQL aprobados y la compatibilidad del formato de códigos. No crear otro generador ni modificar las páginas antiguas como efecto de pruebas.
5. Después de esos contratos: integrar envío/idempotencia/estados al panel existente, procesamiento confiable de imágenes, asociación/limpieza recuperable, revisión ADMIN y publicación canónica. Las escrituras SQL y el almacenamiento R2 no comparten una transacción: requieren compensación persistente y reintento; no afirmar atomicidad distribuida ficticia.

## Checklist de validación todavía pendiente

- [ ] Flujo completo residencial, lugar, gratis, premium y pro; las cantidades por sí solas no prueban subidas.
- [ ] PostgreSQL nativo aislado: escrituras, reintentos y concurrencia de solicitud/aprobación.
- [ ] Decodificación y recodificación de JPG/PNG/WebP, límites de bytes/píxeles, archivo inválido y limpieza tras fallos.
- [ ] R2 privado: carga y recuperación autorizadas, denegación a otro usuario, metadatos sin credenciales.
- [ ] ADMIN revisa datos/medios y aprueba; cliente no publica.
- [ ] Unicidad AD507 entre el sistema anterior y nuevo; una solicitud repetida genera una sola dirección.
- [ ] Publicación mediante el mecanismo existente y enlaces/QR conservados.
- [ ] CI del SHA final y compatibilidad del snapshot anterior.
- [ ] Pruebas físicas móvil/tablet/desktop, Google/logout, cada formulario, vista ADMIN, imágenes y enlaces/QR.
- [ ] Migración individual posterior: código/enlace original, captura previa, comparación, aprobación y reversión por dirección. Sin migración masiva.

Ninguna tabla, registro histórico, página publicada, DNS, Excel, Apps Script, configuración Railway o rama de producción fue modificada por esta revisión. El flujo sigue sin habilitarse. Esta auditoría identifica un bloqueo de integración; no equivale a un cierre operativo.
