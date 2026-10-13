# Cierre técnico Direcciones507 + Direcciones LATAM — 11 octubre 2026

Encargo: cero funciones nuevas, sin merge, deploy, SQL productivo, DNS, credenciales, recursos adicionales o cambios históricos. Referencias revisadas: PR51 7535f2cdaa38b475538769fa5d90c31a38134713; PR52 ee9d715674235aa5a02390fa3e4dcd249ad40a4e. Este reporte sustituye los estados previos de adquisición del dominio y distingue código probado de activación pendiente.

## Resultado y cambio indispensable

Única corrección funcional: renderNewPublicAddress reutiliza el QR/compartir/copiar existentes, pero toma la URL canónica guardada en vez de window.location.href. Evita entregar una URL de preview Railway o parámetros de navegación. No cambia la plantilla fuente ni ningún archivo/QR/registro histórico. Pruebas nuevas verifican PA/CO/CR, payload efectivo del QR, scripts y URL original en el renderer de traslado individual preparado. Renderizar una propuesta extranjera en prueba no habilita rutas/publicación extranjera.

Archivos de este cierre: core/runtime/new-address-publication.ts, core/runtime/tests/canonical-delivery.test.ts y este documento. PR51 conserva HEAD y archivos intactos. Commit final y ejecución Actions de esta corrección se registran en la descripción de PR52 al terminar la suite; resultados previos: PR51 Actions38176202779 SUCCESS (96/0); PR52 Actions38177152901 SUCCESS (116/0,1851 aserciones), PostgreSQL18.1/Docker/legacy/build. No confundir esos runs con el nuevo commit.

## Evidencia real consultada

Railway proyecto amused-enchantment 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d; production909fdec4-8930-4405-ae53-6e8fb0d3f901. ad507-core b0da9f70-7790-4729-a728-aaa4aa3f571d, deployment e43bec48-2518-41bc-814a-a99da78eb6c4 SUCCESS, fuente feat/admin-ui-20261006. Postgres ce124693-1fef-432f-9824-e315d5cabd9d SUCCESS, imagen postgres-ssl18, volumen 9cccf287-430d-43f3-8f12-d1cd0d3670bb de5000MB en /var/lib/postgresql/data. Cuatro servicios SUCCESS, cero cambios staged. No son pruebas de SQL aplicado ni recuperación del snapshot.

Configuración live: rootDirectory /core/runtime, dockerfilePath Dockerfile, puerto8080, una réplica sfo, healthcheck /health. Dominios declarados en el mismo servicio: ad507-core-production.up.railway.app, direcciones507.com, www.direcciones507.com, cuenta.direcciones507.com. **direcciones.lat no está registrado allí**. Solo se consultaron nombres de variables; DATABASE_URL y cuatro R2 presentes. Los indicadores de verificación R2/namespace/workflow/raíz/internacional están ausentes; no se configuran.

## Bloqueos resueltos y controles preservados

|Área|Evidencia/estado|Límite real|
|---|---|---|
|Código nuevo|UUID canónico → AD507-N +32hex; idempotencia por ID; normalización; UNIQUE/code y propuesta normalized-code; PG/advisory/row locks y concurrencia probados|No prueba exclusividad futura frente a emisor histórico sin contrato|
|R2|Operador acreditó token activo direcciones507-r2-railway, Object Read & Write en direcciones507-media, cuatro variables y prueba real write/read/delete aprobada|No repetida; nuevo gate requiere autorización productiva; no incidente de exposición identificado|
|Fotos|PA y objetos anteriores mantienen addresses/UUID; nuevos extranjeros countries/CO/addresses/UUID; permisos y país contra PG, intent antes PUT y reintentos probados|No se mueven/borran/reescriben objetos históricos; R2 real no se usa en CI|
|Arquitectura|Una aplicación, ADMIN, auth, requests, PG, R2, orders/audit/publicación; unión de HEADs sin conflictos y CI de revisión combinada|No merge autorizado ni autenticación internacional activa|
|País/dominio|PA inicial en507, renderer compartido enlat, prefijo/country coherente, canonical507 paraPA ylat extranjeros|Gates y países extranjeros cerrados; dominio adquirido pero no configurado|
|Entrega|QR/share/copy corregidos en el renderer existente; destino canónico probado|Entrega real bajo dominio depende del routing pendiente|
|Pagos|YAPPY_PAYMENTS_ENABLED=false y PAYPAL_PAYMENTS_ENABLED=false; confirmación no publica|No se solicitan credenciales ni sandbox/cobros nuevos en este cierre|

### A. Exclusividad histórica: falta evidencia concreta

Se reutilizó el preflight de lectura existente con un GET a la autoridad PLANES44 configurada. Resultado: configurationVerified=true, results.ok=false, SOURCE_NOT_VERIFIED, allocationVerified=false/publicationVerified=false. No se editaron Apps Script, Excel ni PLANES; no se hicieron llamadas a emisores alternativos. No es evidencia de colisiones ni de ausencia de ellas.

La base impide duplicados entre direcciones nuevas y datos importados en esa misma base. No puede imponer una restricción a un emisor externo independiente. Acción del propietario: aportar lista completa de códigos vigente desde la autoridad real y evidencia de solo lectura del contrato de TODOS los emisores activos/manuales que excluya AD507-N[32hex]. Cotejar la lista con códigos normalizados PG usando el diagnóstico existente; no usar máximos numéricos ni lista parcial como reserva. Si un emisor admite ese espacio, no activar AD507_HISTORICAL_NAMESPACE_VERIFIED por atestación ficticia. Resolver la política con autorización separada; no modificar históricos en este cierre.

### B. Esquema productivo: cotejo aún no ejecutado

El conector Railway no expone SSH, queries PostgreSQL ni credenciales utilizables de la red privada. CLI local ausente. Buscar schemaFingerprint en logs de ad507-core desde el respaldo devolvió0 entradas. Esa ausencia no demuestra nada sobre el esquema. No se puede afirmar que columnas/índices estén aplicados por ver servicios SUCCESS.

Acción exacta de lectura: descargar postgres-diagnostic.mjs del HEAD revisado (SHA2566580d12cddf0c44a5c1b703a780c081e4a7cacd90c526f7e072b3416d46bc99b) y reutilizar el procedimiento SSH/SCP existente en pr51-r2-diagnostic-20261011.md, **solo diagnóstico PostgreSQL; no repetir R2**. Dentro de la misma réplica donde se copió:

```sh
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --service b0da9f70-7790-4729-a728-aaa4aa3f571d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 -- bun /tmp/ad507-pg-check-20261011.mjs
```

Es una transacción REPEATABLE READ READ ONLY, max1, timeout10s/locks2s; hereda DATABASE_URL sin imprimirla. Compartir JSON (columnas/tipos/nullability, constraints validados/defs, índices, ledger/checksums, conteos normalizados), no env/filas personales. ok:true significa lectura exitosa, no migración autorizada. Sin acceso SSH de operador o permiso de fallback al navegador, esta parte permanece bloqueada. No crear endpoint/función/servicio para suplirlo.

### C. Snapshot real y restauración: no acreditada

Respaldo existente identificado por la evidencia anterior: 2026-10-11T16:39:30.690Z =11:39:30 Panamá,245MB; Postgres/volumen arriba. No se crea otro. No se recuperó su UUID ni integridad desde el conector actual (sin operación de backups/restore); no se afirma prueba de recuperación. El proyecto actual solo dispone del volumen productivo y no tiene destino descartable habilitado.

Railway documenta restore que prepara reemplazo del montaje productivo y redeploy; ese procedimiento infringe las restricciones. API pública documenta volumeInstanceBackupList y volumeInstanceBackupRestore, pero no acredita aquí que un snapshot pueda clonarse a otro destino sin tocar su instancia de origen. No se ejecuta ni se prueba una mutación para averiguarlo.

Acción exacta: Railway → proyecto amused-enchantment → Postgres → Backups, identificar el snapshot de11:39 y obtener UUID/estado/tamaño/expiración sin pulsar Restore. Solicitar a Railway un procedimiento soportado de exportación/clonación de ESE snapshot que conserve montaje y servicio originales. Solo si existe ese procedimiento y un destino aislado autorizado: restaurar, arrancar PG18, verificar ledger/esquema/conteos e integridad referencial, registrar IDs origen/destino y eliminar exclusivamente el destino descartable. Si requiere recursos facturables, informar importe/duración y obtener techo antes de crearlos. Restaurar datos sintéticos en CI o hacer un dump nuevo no acredita este snapshot.

## DNS y routing: valores reales, sin aplicación

Consulta DNS pública11octubre: direcciones507.com A185.199.108.153/109.153/110.153/111.153 (GitHub Pages); direcciones.lat A162.255.119.76, CNAME sin respuesta. Ambos NS dns1.registrar-servers.com y dns2.registrar-servers.com. Adquisición de direcciones.lat confirmada por propietario; DNS actual no verifica acceso al backend.

Railway domain-status de direcciones507.com: verified=false, certificado ISSUING, puerto8080, CNAME pendiente. Valores preparados para ese dominio registrado:

|Dominio|Host Namecheap|Tipo/valor solicitado por Railway|Uso/estado|
|---|---|---|---|
|direcciones507.com|@|Destino CNAME jlx3os36.up.railway.app (apex mediante ALIAS según soporte DNS)|**NO aplicar directamente**: cambiaría entrega de todas las rutas dePages|
|direcciones507.com|_railway-verify|TXT railway-verify=01f81ae8a2920a44b47c286954176744a2cb52b145e68a19e9cba9cd1a1fadb5|Atestación DNS pública, específica de este dominio; sin cambios|
|direcciones.lat|@|Pendiente del CNAME asignado al registrar este hostname en ad507-core|No reutilizar destino/tokens de otro dominio por suposición|
|direcciones.lat|_railway-verify|Pendiente del TXT emitido para este hostname|No inventado, no copiar token507|

Los registros definitivos lat solo pueden obtenerse al registrar el dominio en el servicio EXISTENTE tras autorización de configuración. No se crea servicio, no se modificaDNS ni se activa certificado en este cierre. Verificar Namecheap AdvancedDNS/HostRecords y soporte ALIAS para apex antes de aplicar; TTL automático según operador. Ningún cambio de NS está autorizado.

DNS no divide tráfico por path. El backend actual no acredita servir archivos AD507 históricos dePages como reemplazo. Antes de apuntar507: resolver en la capa de routing disponible una entrega selectiva de raíz/auth/admin/API/fichas NUEVAS al mismo backend y paths/QR/assets históricos al origenPages, con precedencia comprobada. No redirigir todo el dominio, no cambiar index.html histórico y no asumir que los customDomains declarados enRailway ya reciben tráfico. Si esa capa no existe entre los recursos actuales, no activar507: requerirá autorización concreta de la configuración de entrada. No se implementa otro publicador o proxy en código como función nueva.

## OAuth/sesiones entre dominios

General-auth verifica un solo origen/callback configurado; successURL debe pertenecer a ese origen. Cookie Secure/HttpOnly/SameSite=Lax host-only, una identidad/sesión central enPG. Test de origen no permitido continúa rechazando. El usuario puede cambiar país en el documento sin perder campos/Files; eso no es una transferencia entre hosts.

El mismo auth **no admite actualmente login/sesión operativa simultánea en507 ylat**. Cookies de dos dominios independientes no pueden compartir Domain. Registrar DNS/certificado no resuelve OAuth. Acción antes deLATAM: seleccionar el ingreso canónico del mismo auth o autorizar los callbacks/orígenes del flujo existente y comprobar sesión/CSRF/return en ambos hosts. No abrir CORS, copiar tokens por URLs, crear otroauth ni afirmar SSO listo. Esta parte no se cambia en el cierre de cero funciones nuevas; Panamá puede validarse primero en su origen autorizado. Los valores reales de callback/success son variables presentes, no se publican secretos/valores completos desde el conector.

## Procedimiento de integración y migraciones (preparado, no ejecutado)

1. Congelar SHA51 y SHA52 aprobados, comprobar base/productiva feat/admin-ui-20261006 y unión sin conflictos. Con autorización posterior, integrar51 en esa base; retargetear52 y verificar de nuevo el resultado combinado antes de integrarlo. No merge en este trabajo.
2. Obtener JSON read-only de producción, cotejar6foundation/checksums/constraints/índices; recuperación del snapshot real acreditada. Comparar también los archivos SQL completos, no solo8 columnas. Negarse ante drift o colisión, sin backfill/renumeración. No reejecutar0000–0005.
3. Orden mínimo para plataforma compartida sin cobros: landline.sql → requests.sql → countries.sql → scalability-indexes.sql. payments.sql → paypal.sql quedan preparados aparte, no requisito para lanzamiento con pagos desactivados. countries requiere requests y CHECKoriginalprefix; las nuevas consultas country requierencountries aplicado antes del cambio de código.
4. Asignar versiones libres según ledger real. Para CADA propuesta: envolver su cuerpo sin BEGIN/COMMIT externos en una sola transacción del operador; SET LOCAL lock_timeout5s/statement_timeout60s; LOCK ad507.schema_migrations IN EXCLUSIVE MODE; verificar ledger/checksums/prerequisitos/ausencia de la versión; aplicar cuerpo EXACTO revisado; comprobar postcondiciones; INSERT misma versión/checksum/actor/SHA en ad507.schema_migrations; COMMIT. Ante error ROLLBACK y detener. Registrar esquema/ledger en la misma transacción; no registrar después del commitDDL ni editar migraciones históricas. El prepare-0005 existente es referencia del patrón, **no sirve para aplicar estas propuestas**; no se añade runner nuevo.
5. Postcondiciones landline: text +CHECK válido; requests: hashes/JSON/review/receipt/media status tipos y FK, code nullable solo bajoCHECKuncoded, UNIQUE(code), índiceUNIQUEupper(trim(code)), índicesUNIQUErequestkey/payload; countries: textDEFAULTPA NOTNULL, país/prefijo/JSON consistency y country/status; scalability: seis índices de página/país/parciales porestado/tipo segúndefs. Conteos y códigos previos intactos; estas verificaciones aún requieren resultado real.
6. Antes deDDL elegir ventana por tamaño real: estos CREATEINDEX transaccionales pueden bloquear escritura. Si el tamaño exige CONCURRENTLY, preparar revisión/autorización de secuencia específica fuera de esa transacción; no transformar/aplicar arbitrariamente. No ejecutar rollback-requests cuando hay solicitudes: ese script ya se niega ante datos nuevos. Reversión de aplicación conserva datos/columnas/órdenes; no bajar código a una versión que asuma codeNOTNULL después de nuevas filas sin código.
7. Configuración Railway futura: el Docker probado usa contexto raíz del repositorio; cambiar rootDirectory a / y dockerfilePath a core/runtime/Dockerfile conjuntamente en releaseautorizado. Conservar mismo servicio/puerto8080, /health y comandoBun en WORKDIR/app/core/runtime. No enviar solo uno de esos cambios ni apuntar rootactual/core/runtime alDocker queCOPYcore/runtime. Sin configuración efectiva nueva hoy.
8. Antes decommit de stagedrelease revisar patch completo, sin cambios aPostgres/n8n/shadow/volumen/DNS. Mantener Yappy/PayPalfalse y todos los gates comercial/root/país cerrados en el primer deploy autorizado. El wrapperlegacy conservado contiene suDDL de arranque existente; revisar su efecto sobre esquema/restauración antes de autorizar reinicio, no presentarlo como un arranque sin escrituras ni modificarlo aquí.
9. Desplegar solo tras autorización; observar RailwaySUCCESS y staged/pending0, health/readiness/auth y permisos; luego verificar rutas/canonical/QR/media/SEO históricas y nuevas sin crear reportes comerciales ficticios. Habilitar R2 confirmado sin nueva prueba física y namespace/workflow únicamente cuando sus evidencias estén resueltas. La raíz507 depende delrouting; extranjero permanece cerrado hastaDNS/TLS/OAuth/país autorizados. No afirmar lanzamiento porbuildverde.

## Checklist de autorización final

- [x] HEADs/código y una arquitectura existente revisados, sin rediseño.
- [x] Evidencia R2 aprobada conservada; claves/privacidad históricas sin cambios.
- [x] Corrección mínima de entrega canónica y pruebas QR preparadas/aprobadas localmente.
- [x] Dominios/servicios/puerto/source reales consultados, sin mutaciones.
- [x] OrdenSQL y procedimiento de ledger/postcondiciones preparados, sin ejecutar.
- [ ] Suite completa del nuevoHEAD: estado final enPR52/Actions tras ejecución.
- [ ] Lista/contrato históricos y cotejoPG normalizado; no atestación falsa de namespace.
- [ ] JSON esquema/ledger productivo cotejado, versiones seleccionadas y locks/rollback autorizados.
- [ ] Snapshot11octubre restaurado de forma aislada con integridad comprobada.
- [ ] Routing selectivo507 preservandoPages; domainlat registrado/valores propios; DNS/TLS autorizados.
- [ ] MismoOAuth validado entreorígenes antes deLATAM.
- [ ] Autorización expresa demerge,DDL/configuración,deploy y activación porfase.

**Estado:** código compatible y pruebas disponibles; activación NO autorizada ni técnicamente acreditada con los bloqueos anteriores. No hay recurso nuevo ni prueba de recuperación real. FuentesRailway: https://docs.railway.com/integrations/api/manage-volumes y secciónRestore obtenida mediante search-docs del11octubre. Los datosDNS públicos y registros de verificación son configuración pública, no credencialesR2/DB/OAuth.
