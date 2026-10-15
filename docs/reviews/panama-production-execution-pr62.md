# PR62 — ejecución productiva y dependencias

## Estado real de continuación — 15 octubre 2026

Esta sección actualiza la evidencia anterior. Autorización actual: preparar y
aplicar migraciones tras respaldo recuperable; no exige restaurar destructivamente
el snapshot del día 11 ni contratar recursos nuevos.

- **Respaldo actual ejecutado y restaurado:** `pg_dump -Fc` completo de `railway`,
  conservado con umask 077 en el volumen PostgreSQL existente:
  `/var/lib/postgresql/data/ad507-before-commercial-20261015.dump`.
  `pg_restore --exit-on-error` a la base separada `ad507_restorecheck_20261015`
  terminó correctamente (`AD507_LOGICAL_RESTORE_PASS`). No se restauró producción.
  Ambas bases: 43 tablas AD507, cero direcciones en PostgreSQL. SHA256 del dump
  de datos AD507 normalizado, excluyendo los tokens aleatorios restrict/unrestrict
  de PostgreSQL 18, idéntico en origen y restauración, observado en consola.
  El respaldo está en el mismo volumen; no acredita recuperación ante pérdida
  del volumen ni una restauración del snapshot físico del 11 de octubre.
  No se crearon servicios ni se contrataron recursos adicionales.
- **Ledger verificado:** 0000–0005 y sus SHA256 coinciden con los seis archivos
  del repositorio. Propuestas comerciales pendientes: landline/requests/countries.
- **SQL de release ejecutado, ensayo y producción PASS:**
  `docs/reviews/releases/20261015-commercial-schema.sql`, SHA256
  `6bce765b9c5b073b7424d5e9217bf8c01abe96db4799e60dc3b876dbd495287b`.
  Reutiliza los cuerpos existentes; transacción única, locks y timeouts acotados,
  guardas del ledger y sus seis checksums, registro atómico 0006–0008 con hash de
  cada propuesta y postcondiciones. No se invoca en startup ni deployment.
  Rechaza repetición o drift. Se confirmó SHA256 del archivo subido en /tmp,
  luego psql con ON_ERROR_STOP en la restauración aislada produjo
  AD507_ISOLATED_SCHEMA_PASS. El MISMO archivo en railway produjo COMMIT y
  AD507_PRODUCTION_SCHEMA_PASS. Postconsulta: ledger 0000–0008, ocho columnas
  comerciales de addresses presentes, cuatro índices comerciales presentes,
  cero constraints sin validar y cero direcciones (igual al conteo inicial).
  No se aplicó payments.sql ni se habilitaron países por agregar country_code.
- **Incidencia de consola resuelta:** la carga de Files agotó tiempo, pero una
  recuperación del controlador permitió observar el archivo completo y verificar
  su hash antes de ejecutar. No se repitió backup ni restauración. La entrada
  larga incompleta previa fue descartada y nunca se ejecutó como SQL.
- **PostgreSQL:** advertencia investigada: muestra de 151 entradas internas LOG
  de checkpoint, cero mensajes PostgreSQL ERROR/FATAL/PANIC. Sin tuning aplicado.
- **Core:** deployment `6d5821d6-ff4b-4b14-a99d-85f962ae0937` SUCCESS,
  main `d0113d6feb532bd9414ab2f00d70b6d8dc933290`. No se fusionó este PR ni
  se cambiaron flags, pagos, R2, Excel, Apps Script o Pages histórico.
- **Exclusividad:** sigue pendiente el contrato de los emisores históricos.
  No se activó AD507_HISTORICAL_NAMESPACE_VERIFIED. Los 40 códigos actuales sin
  duplicados no certifican exclusividad futura de un emisor independiente.
- **Operación final:** NO probada en producción. No existe nueva publicación
  ni URL/QR entregable de esta ejecución. Países adicionales cerrados. Pagos OFF.

La evidencia de R2 y las 166 pruebas aprobadas del HEAD c93f0d6 se reutilizan.
Este cambio documental no convierte aquellas pruebas en validación productiva.

CI posterior #203 detectó un test preexistente desactualizado por PR81: esperaba
un Blob WebP aunque main ya usa la imagen PNG aprobada por el propietario.
Se incorpora main d0113d6 sin revertir ese cambio y se ajusta únicamente C05 a
la URL y nodo de imagen reales. Prueba focal: 6 PASS, 0 FAIL, 30 expectativas.
No se cambió el diseño para satisfacer el test. Revisar el CI del nuevo HEAD.

## Evidencia anterior, conservada como historial

## Evidencia
- Backup visible Railway: 11 octubre 2026 11:39, 245 MB, acción Restore disponible. No se demostró restauración aislada ni se pulsó Restore. Menú del backup solo ofrece Delete backup; no exportación/clonación.
- PostgreSQL comprobado por consola de ad507-core en transacción REPEATABLE READ READ ONLY: missingTables=[], addresses17 columnas/address_media8, country_code ausente, códigos0, duplicados0; ledger0000–0005. addresses_code_check, UNIQUE(code) y NOT NULL code validados; índice core_addresses_normalized_code_uidx ausente. Ninguna restricción no validada. Fingerprint: 3b6c49ac97cf2a327147765de4601968b1078ad10487683399d69d50143b7369. El diagnóstico productivo anterior enumera8 ausencias; PR62 añade country_code, confirmada por lectura directa de columnas.
- PLANES44 HTTP200,40 códigos válidos, sin duplicados ni N32. No demuestra exclusividad futura.
- R2 real revalidado en consola con variables actuales: bun scripts/r2-diagnostic.ts --photo. PUT200, GET200 bytes idénticos, acceso sin firma400 UNSIGNED_AUTHORIZATION_REJECTED, DELETE204, GET404 NoSuchKey, cleanupRequired=false. Objeto temporal _diagnostics/ad507-r2/aaf3b05e-6934-46cc-9b40-22ba37330a77.webp eliminado. Evidencia anterior pr43-four-pending-20261012.md ya acreditaba la misma prueba; informe anterior que la mantenía bloqueada queda corregido.
- PR62: diagnóstico incluye country_code. Circuito, permisos y propuestas verificadas con PostgreSQL real aislado en Actions; no equivale a prueba productiva.

## Bloqueos que deben cerrarse antes de pedir ejecución
1. Contrato verificable de TODOS los emisores históricos activos: no generan AD507-N seguido de32hex ni admiten importación/manual libre en ese espacio. La consulta de40 códigos acredita solo el estado actual. No activar AD507_HISTORICAL_NAMESPACE_VERIFIED por suposición. Si un emisor admite ese formato, el propietario debe autorizar una reserva compartida que ese emisor haga cumplir; una declaración o un UUID no crean exclusividad.
2. Recuperación del respaldo EXISTENTE: no sustituirlo por un pg_dump nuevo. Snapshot2026-10-11T16:39:30.690Z,245MB, volumen original9cccf287-430d-43f3-8f12-d1cd0d3670bb. Railway documenta que Restore crea un volumen y prepara un cambio de montaje; Deploy aplica ese cambio y reinicia el servicio. NO aplicar el cambio por defecto. Ensayo condicionado: autorización previa de costo, clon restaurado asignado exclusivamente a PostgreSQL temporal compatible en el MISMO proyecto/entorno, montaje productivo original restituido en staged, diff final con cero modificaciones productivas antes de aplicar. Si la interfaz no permite ese aislamiento, detenerse y pedir a Railway soporte de exportación/restauración aislada; no restaurar producción para probar. El conector no ofrece operación backup restore ni exportación. Fuente: https://docs.railway.com/volumes/backups .
3. Acceso histórico: proyecto PLANES1A6hGG0gTBwZ6L6yHOqrf9k7Q7KtUa8MonInL3Nmsh8JSG0Bll_n8Tj4Z y Máster verificados en configuración. Drive encuentra el Máster, pero no devuelve proyectos Apps Script accesibles. Navegador con ventas@direcciones507.com muestra Necesitas acceso tanto en proyecto como Máster. No se envió solicitud ni se modificaron permisos. Acción concreta: cuenta propietaria abre el script ligado al Máster, facilita en lectura el código de asignación/importación/manual y los triggers activos, con sus versiones desplegadas; incluir cualquier otro emisor que escriba el mismo registro. No publicar propiedades/secrets.

R2 y lectura del esquema quedan acreditados; falta recuperación del snapshot y exclusividad de TODOS los emisores. No ejecutar DDL ni activar flags por esta evidencia parcial.

## Secuencia exacta, después de evidencia y autorización separada
1. Mantener flujo/cobros apagados. Confirmar HEAD aprobado y backup recuperable; registrar conteos y fingerprint, sin filas ni secretos.
2. Asignar versiones libres y checksums de los SQL revisados en el ledger mediante el procedimiento existente. countries.sql rechaza repetición directa: la idempotencia de release debe provenir de versión+checksum; nunca cambiarlo a ignorar drift.
3. Aplicar landline.sql; verificar tipo text y constraint addresses_landline_phone_valid.
4. Aplicar requests.sql; verificar hashes/data/review/receipt, upload_status, UNIQUE(code), core_addresses_normalized_code_uidx, core_requests_key_uidx y core_requests_payload_uidx; validar checks core_requests_uncoded_check/core_requests_decision_check/core_media_upload_status_check.
5. Aplicar countries.sql; comprobar country_code text NOT NULL DEFAULT PA, core_country_check/core_country_code_check/core_request_country_consistency_check y core_country_status_idx. Datos históricos y códigos intactos.
6. Solo con los pasos anteriores y contrato probado: fusionar PR62 en main y desplegar; esperar Railway SUCCESS. Con R2 probado, habilitar AD507_R2_CONFIGURATION_VERIFIED=true, AD507_HISTORICAL_NAMESPACE_VERIFIED=true y AD507_COMMERCIAL_WORKFLOW_ENABLED=true en ad507-core, sin activar Yappy/PayPal, sin tocar LATAM.
7. Usuario autorizado: Google→panel→Negocio Gratis con datos de prueba designados→guardar; ADMIN→revisar→aprobar→publicar. Registrar URL canónica, QR y lectura sin sesión desde otro dispositivo. No declarar cierre hasta prueba real.

## Reversión
- Si una transacción SQL falla: ROLLBACK; no continuar a la siguiente propuesta.
- Antes de aceptar datos nuevos: deshabilitar flujo; rollback-countries.sql PR62 primero, después rollback-requests.sql; cotejar fingerprint y filas históricas. Ajustar ledger con procedimiento autorizado.
- Después de aceptar solicitudes: deshabilitar flujo y revertir código/configuración manteniendo las columnas y TODOS los datos. Los rollback SQL rechazan pérdida de información; nunca borrar solicitudes ni usar CASCADE para forzar reversión.
- Restore del snapshot productivo requiere autorización propia y evaluación de los datos posteriores; no es el primer paso automático de reversión.
# Activación 15 octubre 2026 — actualización de ejecución

PR62 integrado en main62c6fecd85e53e88e172d41f6c8301430f71f2fd.
Railway deployment323cc395-3edc-414c-9777-80b89509c621 SUCCESS.
Tres flags de flujo comercial/exclusividad histórica/R2 verificado activos.
Pagos desactivados y países sin configuración suficiente cerrados.

Evidencia nueva de PLANES: acceso como propietario; Código.gs versión44 idéntico
al HEAD leído, funciones de lectura/listado y contadores, sin emisión/importación
de códigos;0 activadores visibles. Solo se leyó. El contrato del propietario
reserva toda emisión nueva a Core y preserva incorporaciones históricas manuales.
Se mantienen UUID N32, cotejo vivo del registro histórico e índices únicos.
No se certifica un control sobre futuras ediciones manuales del Máster.

Comprobaciones posteriores: /ready LATAM y Core200, database:true,
authConfigured:true; /AD507-0025/ histórico200; ADMIN sin sesión401.
Se reutilizan CI166/0, respaldo/restauración, migraciones y R2 ya acreditados.
No se repitieron ni se modificaron Excel, Apps Script o Pages históricos.

Pendiente: recorrido productivo autenticado con datos reales del propietario,
incluidos aprobación/publicación, fotografíaR2, URL/QR y Mi cuenta. Google requiere
intervención manual conforme a su instrucción; la revisión automática detuvo
la navegación de autenticación. No se simulan sesiones ni datos comerciales.
El despliegue y flags están verificados; el circuito completo NO está certificado.

Bloqueo productivo encontrado después: POST con Origin HTTPS devuelve403, mientras
el mismo probe sin sesión con Origin HTTP devuelve401. Railway termina TLS y Bun
recibe URL HTTP. Corrección mínima en request-routes.ts: conservar host URL exacto
y reconocer HTTPS solo con x-forwarded-proto:https, igual que general-auth.
No confiar en x-forwarded-host ni aceptar orígenes cruzados. Prueba focal añadida.
