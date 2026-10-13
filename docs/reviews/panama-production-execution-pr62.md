# PR62 — plan productivo condicionado, no ejecutado

## Evidencia
- Backup visible Railway: 11 octubre 2026 11:39, 245 MB, acción Restore disponible. No se demostró restauración aislada ni se pulsó Restore. Menú del backup solo ofrece Delete backup; no exportación/clonación.
- Esquema observado en interfaz producción: addresses 17 columnas foundation; address_media 8. Ausentes las ocho comerciales y country_code.
- PLANES44 HTTP200,40 códigos válidos, sin duplicados ni N32. No demuestra exclusividad futura.
- PR62: diagnóstico incluye country_code. Circuito, permisos y propuestas verificadas con PostgreSQL real aislado en Actions; no equivale a prueba productiva.

## Bloqueos que deben cerrarse antes de pedir ejecución
1. Contrato verificable de TODOS los emisores históricos activos: no generan AD507-N seguido de32hex ni admiten importación/manual libre en ese espacio. La consulta de40 códigos acredita solo el estado actual. No activar AD507_HISTORICAL_NAMESPACE_VERIFIED por suposición. Si un emisor admite ese formato, el propietario debe autorizar una reserva compartida que ese emisor haga cumplir; una declaración o un UUID no crean exclusividad.
2. Recuperación del respaldo: el snapshot visible no ha sido ensayado. Preparar respaldo lógico completo con pg_dump en formato custom, conservarlo cifrado en almacenamiento privado, calcular SHA256, restaurarlo con pg_restore --exit-on-error en PostgreSQL aislado compatible y comparar esquema, conteos y huellas. No sustituir el volumen productivo para ensayar. Esto requiere conexión operativa de diagnóstico y autorización para recursos con costo. Tomar además snapshot reciente antes de DDL. No considerar recuperable el respaldo hasta completar la restauración.
3. R2: comprobar almacenamiento real y privacidad con el procedimiento existente antes de habilitar AD507_R2_CONFIGURATION_VERIFIED=true. La presencia de credenciales no acredita funcionamiento; no imprimirlas ni modificarlas.
4. Lectura de metadatos completa: diagnóstico READ ONLY para tipos, constraints, índices y ledger/checksums. Encabezados UI confirman ausencias, no todos los tipos/restricciones.

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
