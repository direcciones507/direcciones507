# PR #51 — cierre técnico y autorización pendiente

Revisión desde HEAD a51e1d591ef1e34510246f7c659940f3bbfa30ee. PR abierto, base feat/admin-ui-20261006. PR #52 mantiene HEAD 29ab48709412465621ba05d61487ba4b4f231a1a y depende de esta rama; no se modifica. Este documento sustituye los estados obsoletos de cierre/release, conservando su evidencia original.

## Completado

- Corregido el fixture de integración histórica: declara explícitamente el contrato histórico verificado para probar aprobación, bridge, permisos y rollback. Conserva namespaceExclusive:false, así que no permite reservas nuevas. No se cambia el gate runtime ni se omite ninguna prueba. La misma corrección ya está en PR #52.
- R2: configuración y prueba física aprobadas por el operador. No hay evidencia identificada de compromiso; no exigir revocación/rotación ficticia. AD507_R2_CONFIGURATION_VERIFIED sigue fallando cerrado sin true exacto. No repetir diagnóstico ni cambiar secretos/permisos/objetos.
- AD507: UUID canónico, códigos deterministas e inyectivos de 32 hex, normalización, detección de colisiones históricas/SQL y unicidad SQL cubiertos por pruebas existentes. No se declara exclusividad frente a un emisor externo sin restricciones acreditadas.
- Revisión offline de migraciones: commercial-release-review.ts calcula SHA-256 de los seis archivos foundation y las tres propuestas, enumera dependencias y coteja un ledger aportado por el operador. Rechaza versiones faltantes, duplicadas, adicionales o checksums distintos. No abre conexiones, ejecuta SQL, asigna versiones ni activa gates. Incluso una coincidencia exacta no autoriza producción ni prueba índices, respaldo o publicación.
- README del ledger corregido a ad507.schema_migrations. SQL histórico y propuestas no modificados; no hay nuevas migraciones automáticas.
- Pagos: YAPPY_PAYMENTS_ENABLED=false; PR #51 no contiene integración PayPal activa. PR #52 conserva PayPal sandbox deshabilitado para cobros reales. La publicación sigue dependiendo de revisión ADMIN; ninguna confirmación activa/publica por sí sola.

## Preparado y compatible con PR #52

Una arquitectura: auth, ADMIN, formulario, requests, R2 privado, orders/audit_log y publicación existentes. Contratos runtime intactos. La corrección del fixture compartido coincide con PR #52; los archivos nuevos de revisión no se importan en server.ts. No se modifican rutas, plantilla, país, pagos ni base de PR #52.

Orden propuesto: foundation 0000–0005 verificada → landline.sql → requests.sql → countries.sql de PR #52. Para una futura fase de pagos: requests.sql → payments.sql → paypal.sql de PR #52. Payments no es requisito para el lanzamiento sin cobros. No asignar números hasta cotejar el ledger real; no promover propuestas a db/migrations automáticamente. requests.sql incluye nulabilidad, constraints e índices únicos además de columnas: la autorización debe cubrir el SQL completo. PR #52 conservará su HEAD; tras autorización de integración se revisará/actualizará su base por separado.

## Bloqueos reales y acción del propietario

1. **Exclusividad de AD507-N[32 hex].** Aportar evidencia de solo lectura del contrato de TODOS los emisores históricos activos que demuestre que no pueden emitir ese espacio (por ejemplo, generación estrictamente numérica y ausencia de una ruta libre de importación/manual). Una lista actual sin colisiones, un máximo numérico o un UUID no prueban exclusividad futura. Si algún emisor admite ese espacio, se necesita autorización de una política de reserva compartida; no se toca PLANES 44 para resolverlo en este PR. Mantener AD507_HISTORICAL_NAMESPACE_VERIFIED sin activar hasta acreditarlo.
2. **Recuperación del respaldo existente.** Mantener snapshot exitoso del 11 octubre 11:39 Panamá, 245 MB; no crear otro. Solicitar a Railway un procedimiento soportado de exportación/clonación aislada que no reasigne el volumen productivo. El botón Restore que prepara sustitución/redeploy de producción no es una prueba segura autorizada. Solo después de autorización de costo y procedimiento, restaurar el snapshot en destino aislado y registrar arranque, ledger, esquema y conteos sin exponer filas. No se ha probado esa restauración; CI usa bases desechables, no el backup real.
3. **Esquema/ledger productivo y SQL.** Ejecutar el diagnóstico read-only ya preparado mediante el operador, conservando su resultado sin credenciales/filas; cotejar tipos, constraints, índices normalizados y seis checksums con el manifiesto offline. Los diagnósticos existentes no se repiten durante esta revisión. Asignar versiones nuevas en ad507.schema_migrations y preparar la transacción/registro mediante procedimiento de ejecución revisado. No hay runner general de propuestas en este PR. Aplicar únicamente tras autorización explícita, respaldo recuperable y revisión de locks/drift; verificar postcondiciones antes de cada siguiente propuesta. Pagos pueden permanecer sin aplicar/desactivados.
4. **Activación de publicación.** Solo después de 1–3 y autorización: confirmar R2 vigente con AD507_R2_CONFIGURATION_VERIFIED=true, acreditar namespace y habilitar workflow comercial. Revisar base/rama real y Docker context raíz antes de merge/deploy autorizado. No cambiar DNS/Pages ni usar el gate para compensar falta de evidencia. Comprobar posteriormente páginas públicas nuevas, roles, medios privados y cero cambios históricos. En este trabajo no se configuran indicadores ni se activa release.

Las credenciales/condiciones bancarias/sandbox de Yappy y PayPal son pendientes de su fase de cobros, no requisitos para lanzar Panamá con cobros desactivados. El dominio internacional y su verificación pertenecen a PR #52, no bloquean el código Panamá de PR #51.

## Verificación

- Local Bun 1.4.0: 65 pruebas, 0 fallos, 332 aserciones en 14 archivos sin PostgreSQL; compilación servidor, seis migraciones históricas y preservación exacta legacy aprobadas.
- Suite completa con PostgreSQL 18.1 aislado y Docker: resultado del nuevo commit se registra en el PR después de Actions. El entorno local no permite ejecutar PostgreSQL con UID no-root, por eso la integración se valida en el servicio desechable existente de CI, sin tocar bases reales.
- Compatibilidad combinada con HEAD PR #52: revisión de unión Git y compilación/pruebas sin modificar su referencia; resultados finales en el PR.

Sin merge, despliegue, DDL productivo, costos nuevos, diagnóstico físico R2, cambios de credenciales/DNS, Excel, Apps Script, PLANES 44, GitHub Pages, códigos, datos ni fotografías históricas. Código preparado no equivale a activación comercial autorizada.
