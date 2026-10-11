# Verificación R2 sin cambiar credenciales — 11 octubre 2026

## Evidencia comprobada

- Railway ad507-core: SUCCESS, deployment e43bec48-2518-41bc-814a-a99da78eb6c4, sin cambios staged. Fuente productiva feat/admin-ui-20261006; esta preparación está exclusivamente en la rama del PR #51.
- Cuatro nombres R2 y DATABASE_URL presentes. No se leyeron ni publicaron valores.
- No existía un diagnóstico R2 ejecutable por operador. Se extrajo sin cambios el firmador SigV4 existente y se reutilizó en una prueba aislada, sin rutas públicas ni servicios nuevos.
- 25 pruebas locales pasan (R2, diagnóstico, preflight y reserva), 0 fallos, 108 assertions. Las seis migraciones 0000–0005 validan; check-legacy pasa.
- El conector Railway disponible no tiene ejecución remota/SSH. No se ejecutaron PUT/GET/DELETE reales ni consultas PostgreSQL productivas.
- El preflight existente intentó únicamente GET de la autoridad PLANES 44 configurada: SOURCE_NOT_VERIFIED. No se acredita ausencia de colisiones reales ni exclusividad futura por ese resultado.

## Acción exacta pendiente dentro del servicio

Usar una terminal autenticada con Railway CLI y una clave SSH registrada. No es un despliegue ni requiere Cloudflare. Railway documenta SSH/SCP en https://docs.railway.com/cli/ssh . El conector actual no puede ejecutar esta acción; no cambiar startCommand ni crear un endpoint para sustituirla.

1. Descargar de **este commit exacto** los dos archivos mjs en core/runtime/scripts (usar el SHA entregado junto al reporte; no descargar una rama mutable). No necesitan dependencias adicionales.
2. Comprobar SHA256 local:

   - r2-diagnostic.mjs: 122c06e348ea298c87dc766d41ec3f49acb1949d066e81b7988d4a4df66ae7b1
   - postgres-diagnostic.mjs: 6580d12cddf0c44a5c1b703a780c081e4a7cacd90c526f7e072b3416d46bc99b

3. Copiarlos temporalmente al contenedor existente usando los nombres reservados a este diagnóstico:

```sh
scp ./r2-diagnostic.mjs ad507-core-production.up.railway.app@ssh.railway.com:/tmp/ad507-r2-check-20261011.mjs
scp ./postgres-diagnostic.mjs ad507-core-production.up.railway.app@ssh.railway.com:/tmp/ad507-pg-check-20261011.mjs
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --service b0da9f70-7790-4729-a728-aaa4aa3f571d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 -- bun /tmp/ad507-r2-check-20261011.mjs
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --service b0da9f70-7790-4729-a728-aaa4aa3f571d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 -- bun /tmp/ad507-pg-check-20261011.mjs
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --service b0da9f70-7790-4729-a728-aaa4aa3f571d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 -- rm -f /tmp/ad507-r2-check-20261011.mjs /tmp/ad507-pg-check-20261011.mjs
```

No pasar credenciales por argumentos ni imprimir env. Ambos programas heredan exclusivamente las variables del servicio. Compartir únicamente el JSON resultante. Si hay varias réplicas, seleccionar la misma instancia para copiar/ejecutar/eliminar; la configuración observada tiene una réplica.

## Interpretación R2

Para resolver conectividad deben ser true: ok, write.ok, read.ok, delete.ok y absence.ok, y cleanupRequired debe ser false. Solo se escribe `_diagnostics/ad507-r2/<UUID>.txt`; PUT condicional impide sobrescribir una clave previa. Se comparan los bytes recuperados y se exige GET 404 NoSuchKey tras DELETE. Hay timeout, cuerpos limitados, errores filtrados y limpieza incluso si la lectura falla. No se modifican fotos, buckets, variables ni gates de aplicación.

- AccessDenied: la etapa identifica permiso de escritura, lectura o eliminación faltante; revisar el token existente y su alcance al bucket, sin asumir necesidad de reemplazo.
- InvalidAccessKeyId/InvalidToken/ExpiredToken: revisar validez de las credenciales existentes y su correspondencia con la cuenta, sin publicar valores.
- SignatureDoesNotMatch: revisar correspondencia cuenta/clave y firma; no concluir automáticamente que deba rotarse una clave.
- NoSuchBucket o bucketMatches=false: revisar el destino configurado, no crear ni renombrar buckets.
- NETWORK_OR_TLS_ERROR/NETWORK_TIMEOUT: revisar salida de red/TLS del servicio; no atribuirlo a permisos Cloudflare.
- cleanupRequired=true: queda pendiente confirmar/eliminar **solo objectKey indicado**; no repetir indefinidamente la prueba. No borrar otras claves.

El diagnóstico no requiere ni altera AD507_R2_CREDENTIAL_ROTATION_CONFIRMED. Ese gate preexistente sigue cerrando el adaptador de la aplicación: conectividad satisfactoria no equivale a habilitar publicación comercial.

## AD507 y PostgreSQL

La reserva existente usa UUID durable con prefijo AD507-N, normaliza ambos registros antes de comprobar colisiones y requiere exclusividad del namespace. requests.sql propone índice único upper(trim(code)); no se aplicó. AD507_HISTORICAL_NAMESPACE_VERIFIED está ausente en el servicio observado y no se activó. Falta acreditar exclusividad frente a emisores históricos y contrastar sus códigos con PostgreSQL; el máximo numérico no autoriza reservar.

postgres-diagnostic reutiliza inspectCanonicalSchema: transacción REPEATABLE READ READ ONLY, statement_timeout 10s y lock_timeout 2s. Devuelve ledger, columnas, índices, constraints, fingerprint y conteos de códigos; no devuelve filas de clientes. Su ok significa que pudo leer, no que las migraciones estén completas. Revisar missingTables, missingRequestColumns, ledger y codes.normalized_duplicates contra los archivos existentes antes de cualquier DDL. Las propuestas landline/requests/payments siguen pendientes de cotejo productivo y autorización; no se añaden migraciones para ejecutar estos diagnósticos.

No hubo merge, despliegue, cambios de credenciales, DNS, infraestructura, fotografías, transferencias reales ni cobros.
