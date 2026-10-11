# Checklist maestro de cierre — Direcciones507 + LATAM

Actualizado 11 octubre 2026. Este es el checklist de release existente, ampliado documentalmente; no añade funcionalidades ni un segundo sistema. No desplegar hasta verificar asignación de códigos y publicación canónica. PR51:7535f2cdaa38b475538769fa5d90c31a38134713; PR52 funcional:9735178634d467551fe1f05e4c26c8a698158fc4. El cierre READ ONLY está en566b231; la preparación posterior reutiliza únicamente el widgetNatalie existente en el renderer comercial, sin alterar backend/históricos. Sus pruebas se registran en PR52.

**VERDE:** hecho concreto con evidencia. **AMARILLO:** preparado, pendiente de prueba/autorización. **ROJO:** bloqueo de la acción indicada. Un VERDE de CI no sustituye una validación productiva.

|Punto|Estado|Evidencia y alcance exacto|Acción pendiente / responsable|
|---|---|---|---|
|Una arquitectura y unión de PR|VERDE|Unión Git sin conflictos; revisión combinada de PR52, Actions38178311749 SUCCESS118/0. Mismo ADMIN/auth/PG/requests/orders/R2/publicación|Integración posterior autorizada; no merge realizado|
|PR51 regresiones|VERDE|HEAD7535f2c, Actions38176202779 SUCCESS96/0; fallo del fixture histórico corregido sin abrir gates|Mantener HEAD hasta autorización|
|Código nuevo y unicidad en PG aislado|AMARILLO|UUID canónico inyectivo, UNIQUE(code), normalización, hashes, locks, concurrencia y rechazoSQL de duplicados probados|No implica ausencia de colisiones en registros externos|
|Registro histórico vigente del maestro|VERDE|Lectura real autorizada porGoogleSheets: AD507_MASTER_PANAMA_PLANES_2026, tabdirecciones (sheetId244375164), Código enA2; A3:A2008. 40 códigos válidos,0 duplicados normalizados,0 conAD507-N[32hex],20 numéricos/20 otrosválidos;1 requiere normalizar presentación. Sin filas personales ni escrituras|Snapshot de la lectura del11octubre; no acredita todos los emisores ni exclusividad futura. El lector público sigueSOURCE_NOT_VERIFIED, pero esta lectura directa sí aporta evidencia real|
|Exclusividad futura|ROJO|Maestro:40 códigos,0 namespaceN32. Diagnóstico real READ ONLY: addresses total0, duplicados normalizados0. El cotejo actual queda resuelto; falta contrato completo de emisores/manuales|Propietario: acreditar que ningún emisor puede generarAD507-N[32hex]. No activar elgate solo por ausencia actual ni modificarPLANES/Excel/AppsScript|
|PropuestasSQL y orden|AMARILLO|landline→requests→countries→scalability-indexes; tipos/constraints/índices probados enPG18.1 aislado. Payments/paypal separados y apagados|Cotejar ledger/esquema real, asignar versiones libres, recuperación acreditada y autorización completa antes deDDL|
|Cotejo actual de códigos PG / maestro|VERDE|Una ejecución real del diagnóstico: total0, uncoded0, noncanonical0, normalized_duplicates0 en ad507.addresses. Maestro autorizado:40 válidos,0 namespaceN32|No existen códigos PG que colisionen con ese snapshot histórico. No acredita otros emisores ni exclusividad futura|
|Ledger productivo 0000–0005|VERDE|Lectura real enRailway Database/ad507/schema_migrations: seis versiones0000–0005, seis SHA256 coinciden exactamente con los archivos locales. Catálogo ad507 y tablasfoundation/auth/Natalie visibles|Solo ledger/presencia de tablas; no certifica tipos/constraints/índices|
|Columnas productivas pendientes|VERDE|Encabezados reales deaddresses:17columnasfoundation, sinlandline_phone/request_key_hash/request_payload_hash/request_data/review_decision/reviewed_by/publication_receipt/country_code. address_media:8columnas, sinupload_status|Confirma ausencia de8columnasPR51 +country_codePR52. Ninguna aplicada enesta inspección|
|Diagnóstico completo productivo|VERDE|Autorización limitada del propietario; bundle SHA256 verificado, UNA ejecución desde Consolead507-core, salida0, ok:true/readOnly:true, missingTables:[]. Fingerprint3b6c49ac97cf2a327147765de4601968b1078ad10487683399d69d50143b7369|Cotejo real completado. No migraciones ni escritura de datos. No volver a ejecutar bajo esta autorización de una sola vez|
|Backup11octubre11:39Panamá|VERDE|Confirmado enUIRailway:2026-10-11T16:39:30.690Z,11:39:30Panamá,245MB. Snapshot listado conRestore disponible; PITRoff y sinschedule. Backupactions solo ofreceDelete; no se pulsaron mutaciones|Identificación visual resuelta; integridad/recuperación pendiente. UUID no expuesto por laUIinspeccionada, no inventado|
|Recuperación del snapshot real|ROJO|No restaurada. Sin destino descartable autorizado; restore estándar reemplaza montaje y redeploy productivo|Railway debe acreditar exportación/clonación aislada soportada. Autorizar costo/destino antes de recursos; no mover volumenlive|
|R2 configuración y roundtrip real|VERDE|Evidencia aportada por propietario: token activo direcciones507-r2-railway, ObjectRead&Write enbucketdirecciones507-media,4variables y write/read/delete aprobados|No repetir roundtrip ni inventar exposición/rotación; gate aún no configurado enproducción|
|R2 compatibilidad y permisos|AMARILLO|CI: clavesPA antiguas conservadas, país extranjero/UUID, propiedad, roles, linkedmedia, intent/reintento privado. Archivos/objetos reales sin cambios|VERDE limitado a contratoCI y preservación; comprobar release real tras autorización|
|Entrega QR/canonical|AMARILLO|Renderer existente usaURLcanónica; pruebasPA/CO/CR y URLoriginal del traslado. Actions118/0|Payload probado, sin crear ficha/QR/registro real; routing productivo pendiente|
|País/navegación/formulario|AMARILLO|PA por defecto, selector sincronizado, datos/Files conservados al navegar dentro del documento, validación servidor y foreigngates probados|No acredita transferencia de sesión/Files entrehosts|
|Routing507 y URLs históricas|ROJO|DNS507 permaneceGitHubPages; Railwaycustomdomain sin verificar. Backend no acredita reemplazar todos los archivosPages|Autorizar/verificar routing selectivo existente antes de cambiarDNS. No redirectglobal, no tocarindexhistórico|
|direcciones.lat adquirido|VERDE|Confirmación expresa del propietario en encargo de cierre|No equivale aTLS/DNS/hostRailway conectado|
|Conexiónlat/DNS preparados|AMARILLO|Mismo servicio/puerto8080 identificado. lat no está registrado; no hayCNAME/TXT propios emitidos|Autorizar registro de hostname en servicio existente para obtener valores específicos; DNS aún prohibido. No copiarTXT507|
|OAuth / Mi cuenta Panamá (CI)|AMARILLO|Mismoauth, sesiones, identidad, rolesADMIN, CSRF y ownership enActions; no se duplican cuentas|Origen productivo/callback efectivo se revisa en activación; valores secretos no publicados|
|OAuth / Mi cuenta entre dominios|ROJO|Auth actual mono-origen/callback; cookiehost-only, no sesión compartida acreditada. No se eludeCSRF/CORS|Resolver configuración del mismoauth e ingreso autorizado en amboshosts y validarlo antes deLATAM, sin otroauth ni tokens porURL|
|Natalie — preservación existente|VERDE|check-legacy exige extracción exacta de snapshot salvoextensionseam. CI verifica rutasSESSION_ROUTE/CONVERSATION_ROUTE/ROUTE conservadas; dispatch negativo session/query aislado. Fuentes: core-runtime-baseline.md y core-oauth-cutover.md|No implica conversación real ni capacidad nueva; fuentelegacy no modificada|
|Natalie — validación productiva positiva|AMARILLO|No se generaron conversaciones/sesiones reales. Esas llamadas pueden escribir auditoría/estado y consumir proveedor, por eso no son diagnóstico read-only|Reutilizar capturas existentes o autorización específica con registro designado y presupuesto si aplica; no disparar llamadas nuevas para marcarverde|
|Natalie — reportes previstos|AMARILLO|seo-intelligence.md permite lectura de KPIs, periodos, interacciones y anomalías mediante contratos aprobados; prohíbe SQL/secrets/OWNER/PIN. Es arquitectura documentada, no integración nueva comprobada|Mantener frontera aprobada; no implementar herramientas/reportes nuevos en este cierre ni convertir previsiones en tareas duplicadas|
|Escalabilidad medida|VERDE|Benchmark aislado1k/10k/100k; pool2 y paginación porcursor. Resultados y límites enPR52|Solo filas/consultas sintéticas. Un millón es proyección; cargaHTTP/media sostenida pendiente antes de promesas de capacidad|
|Pagos apagados en el código candidato|VERDE|Yappy/PayPal reales desactivados; pruebas deconfirmación/idempotencia y pago sin publicación automática|No activar cobros ni pedir credenciales de pago en este cierre|
|EstadoRailway vigente|VERDE|ad507-core deploye43bec48 SUCCESS, sinstaged; servicioactual conserva feat/admin-ui-20261006. Lectura deestado11octubre|No confundir condeploydePR51/52; ninguno desplegado|
|Integración/DDL/deploy/activación|AMARILLO|Procedimiento preparado en reporte de cierre; código yDocker deCI aprobados|Autorización expresa separada; resolverROJOS relevantes antes deactivación|

## Natalie: responsabilidades existentes, sin ampliaciones

La evidencia de códigos usa únicamente la columna A del maestro de autoridad identificado en el preflight existente (ID1l0QlB8Y_3qE_SN2KuygiepsAKgxwhFvc53YOrCEd8YQ). Metadatos verificaron la pestaña y su límite de2008 filas antes de leer. No se consultaron valores de teléfonos, nombres, OWNER, PIN ni tokens; no se modificó la hoja.

Fuentes: docs/architecture/core-runtime-baseline.md (sesión/conversación/query actuales), docs/architecture/core-api-contracts.md (lector público no debe llamarNatalie síncronamente), docs/architecture/seo-intelligence.md secciónNatalie reporting boundary (reportes mediante contratos de lectura aprobados), docs/runbooks/core-oauth-cutover.md (no llamarNatalie como prueba read-only porque escribe/cuesta).

No se le asigna reservar códigos, aprobar migraciones, restaurar respaldos, cambiarDNS, modificarPLANES, publicar negocios ni confirmar pagos. Esas responsabilidades no están acreditadas en los documentos. No se crea checklist paralelo deNatalie ni se añaden funciones. Se conserva su papel existente y se señalan las capacidades de reportes solo como previstas.

## Continuación autorizada: evidencia UI y siguiente paso

El propietario autorizó fallback al navegadorRailway en lectura. Se inspeccionaron Backups, catálogo/ledger/encabezados y Console/Files del servicio existente; acceso real confirmado, sinRestore, terminalcommands,SQLmanual,uploads ni cambiosdevariables/DNS. El bloqueo anterior de falta de acceso al navegador queda resuelto. No volver a pedir esa misma autorización.

La autorización posterior y limitada del propietario permitió copiar el bundle existente y ejecutarlo UNA vez en READ ONLY, sin cambios de variables, instalación ni gasto. El diagnóstico finalizó correctamente. Las lecturas posteriores fueron del archivo JSON local del contenedor, no nuevas consultas SQL. La recuperación del snapshot sigue requiriendo método soportado independiente; no se pulsó Restore.

### Atención al cliente y participación real de Natalie

- VERDE (presencia real): GETdirecciones507.com devolvió200; HTML público contiene elwidgetNatalie, endpointscontrolled-session/controlled-conversation, enlaceForms, WhatsAppcentral y guía de formulario. SHA256 de toda lahomepage difiere delindex de la rama; no se declara igualdad de todas las versiones ni se modifican históricos.
- AMARILLO (respuesta real): no se abrió elwidgetni se enviómensaje: abrirlo crea sesión mediantePOST y responder utiliza proveedor/auditoría. Mantener prueba positiva pendiente de autorización específica; no marcarrespuestaautomática aprobada solo porHTML.
- El código existente ofrece conversacióninformativa controlada de3mensajes, USER_IDad507-controlled-user-001 y estado de sesiónenmemoria deldocumento; endpointbackendpermisos/estadoPG conservados. El flujo web usa sesión y peticionesHTTPS; no usaWhatsApp/celular para procesar esas consultas. Eso conserva independencia del teléfono, pero no acredita acceso privado exclusivo delpropietario o continuidaddechat entredispositivos.
- AMARILLO antes de cambiar raíz comercial: commercialEntryHtml reutiliza ahora el HTML/CSS/JavaScript de Natalie desde index.html intacto. Un solo script con nonce y destinoHTTPS específico en CSP. Backend conservado; no se crea sesión al renderizar. Solo funciona bajo los dos orígenes507 permitidos; prueba positiva real todavía pendiente. userPanelHtml yADMIN no se modifican para incorporar otro asistente.
- AMARILLO antes deLATAM: NATALIE_ALLOWED_ORIGINS delbackend existente admite507 ywww507, no direcciones.lat. No se cambiaCORS ni se afirmaque funcione enel dominioextranjero.
- WhatsAppcentral esun enlace decontactomanual; GoogleForms recibe solicitudes medianteflujoexistente; la guía esayudaestática. No hay evidencia aquí derespuestaWhatsApp automática, cobro, aprobación o publicación autónoma porNatalie. Los reportes delpropietario mediantecontratos delectura siguenprevistos, sinSQL/secrets/PIN/OWNER ni herramientasnuevas.


Reporte/procedimiento existente: docs/reviews/final-platform-closeout-20261011.md y descripción actual dePR52. Este checklist registra hechos; no elimina controles preventivos para obtener unverde ficticio.


## Diagnóstico PostgreSQL autorizado — evidencia real y cotejo de propuestas

Ejecución única en Console de ad507-core, instancia4206dbfb-d257-400f-a30a-25e5c32986e6, deployment e43bec48-2518-41bc-814a-a99da78eb6c4. Fuente inmutable: commit9e424e693cdc3cf4729e4839cd4346b4f2f435c7, core/runtime/scripts/postgres-diagnostic.mjs. Copia /tmp/ad507-pg-check-20261011.mjs con permisos0600 y creación exclusiva; SHA2566580d12cddf0c44a5c1b703a780c081e4a7cacd90c526f7e072b3416d46bc99b coincide. Se usó Bun ya instalado; no curl/wget/instalaciones. Resultado temporal /tmp/ad507-pg-check-20261011.json: DIAGNOSTIC_EXIT=0, ok:true, readOnly:true. Estos archivos temporales no contienen credenciales ni filas personales y no se incorporan a la imagen de la aplicación.

Revisión previa: wrapper sin startup del servidor; una conexión (max1), BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY, verificación transaction_read_only=on, SELECT de metadatos/ledger/conteos agregados, timeouts locales10s/2s y cierre de conexión. El driver contiene funciones genéricas de replicación/listen que NO son invocadas por este diagnóstico; la consulta inicial de tipos es SELECT de pg_catalog. No se ejecutaron DDL, DML, Restore ni mantenimiento. No se imprimió DATABASE_URL ni datos personales. La autorización puntual queda consumida; ninguna repetición automática.

Resultado:377 columnas,481 restricciones y96 índices del esquema ad507; todas las tablas requeridas presentes. Ledger0000–0005 y sus seis checksums coinciden con db/migrations. addresses tiene17 columnas foundation: id UUID, code TEXT NOT NULL, status/source TEXT, plan_id UUID, coordenadas NUMERIC, legacy_payload JSONB y timestamps TIMESTAMPTZ. address_media conserva foundation. UNIQUE(code) y su índice addresses_code_key existen; addresses_code_check validado exige ^AD507-[A-Z0-9_-]+$. FK de plan y checks de tipo/estado/coordenadas presentes y validados. Índices observados: addresses_pkey, addresses_code_key, core_addresses_plan_idx, core_addresses_type_status_idx; address_media_pkey, core_address_media_address_idx, core_address_media_one_primary_idx. No se confunde este UNIQUE con exclusividad externa/futura.

|Propuesta existente|Cotejo real|Estado|
|---|---|---|
|landline.sql|landline_phone ausente; no colisión de tipo. Prepara TEXT y check del teléfono fijo sin backfill|AMARILLO: compatible con evidencia; no aplicada|
|requests.sql|request_key_hash/request_payload_hash/request_data/review_decision/reviewed_by/publication_receipt y address_media.upload_status ausentes. Tipos foundation requeridos presentes. code todavía NOT NULL; propuesta lo permite NULL solo bajo su check de solicitud, conserva UNIQUE y añade índices normalizado/idempotencia|AMARILLO: compatible con evidencia; no aplicada|
|countries.sql|country_code ausente; addresses_code_check real tiene exactamente el patrón requerido. Dependencia request_data aún ausente, por eso debe seguir requests.sql|AMARILLO: compatible en el orden previsto; no aplicada|
|scalability-indexes.sql|Índices de paginación/país/solicitudes/lugares todavía no presentes en addresses. Depende de country_code de countries.sql|AMARILLO: preparada después de countries; no aplicada|

Ocho columnas comerciales pendientes confirmadas (siete addresses + upload_status), más country_code. No hay drift identificado en los prerrequisitos revisados; esto no convierte propuestas en migraciones aplicadas ni sustituye restauración/revisión/autorización de release. Orden conservado: foundation0000–0005 ya existentes → landline → requests → countries → scalability-indexes; asignar versiones libres y checksums mediante procedimiento de release existente. Payments/paypal fuera de activación inicial, cobros reales apagados.

Códigos: total0/uncoded0/noncanonical0/normalized_duplicates0. Comparado con snapshot maestro de40 códigos autorizados: sin colisiones actuales con PostgreSQL ni namespaceN32 en ese maestro. allocationVerified:false y publicationVerified:false permanecen; exclusividad futura sigue ROJO por falta de contrato de todos los emisores. No se modifica el gate.

### Natalie — preparación de reutilización, sin otro asistente

VERDE: backend actual conservado (legacy.ts, sesiones, conversación, permisos y auditoría), independiente del teléfono. AMARILLO: preparación de integración del widget EXISTENTE de index.html en commercialEntryHtml, usando sus mismas rutas controlled-session/controlled-conversation y el mismo backend; no añadir otro servicio, identidad, autenticación ni motor. Antes de conectar: preservar contrato de sesión/permisos, confirmar acceso del propietario sin inventar continuidad entre dispositivos, validar origen direcciones.lat en el mecanismo existente y probar conversación con autorización específica si genera estado/costo. No se copia ni modifica index histórico, no se agrega funcionalidad en este diagnóstico. Estado de ese diagnóstico: no conectado aún. La continuación de este checklist prepara ahora su reutilización en commercialEntryHtml para507; conversación real/activación aún no comprobadas.

### Siguiente acción y autorizaciones que permanecen

El acceso y cotejo PostgreSQL quedan VERDE. Pendientes reales: contrato de exclusividad futura; restauración aislada verificable del snapshot11octubre; continuidad del widgetNatalie antes de cambiar raíz; routing selectivo que preserve Pages y configuración/validación OAuth de los dos dominios. Solo después: autorización separada para aplicar migraciones ordenadas, configurar hosts, integrar PR51/52 y desplegar. Este diagnóstico no autoriza ninguna de esas acciones.


## Cierre de puntos pendientes desde566b231 — sin repetir diagnóstico

### Emisores: alcance comprobado y garantía pendiente

|Canal real existente|Evidencia revisada|Garantía y límite|
|---|---|---|
|Nuevo sistema comercial|new-address-publication.ts: UUID canónico→AD507-N[32hex]; snapshot histórico normalizado, lectura PG, rechazo de colisión y gate obligatorio|Idempotencia/locks por solicitud, UNIQUE(code), índice normalizado propuesto y pruebas concurrentes ya existentes. No control sobre escritores externos|
|Lugares Core anteriores|core/postgres/place-code.ts/place-create-repository.ts: slug limitado24 + guion + sufijohex máximo6, UNIQUE y reintentos acotados|Lenguaje disjunto deN32 sin guion interior; prueba añadida sin alterar este emisor. No acredita activación productiva de esa ruta|
|Aprovisionamiento residencial|Backendlegacy recibe/valida códigos suministrados; no emite códigos comerciales nuevos|Preservado; origen de esos códigos en PLANES no demostrado por esta ruta|
|Generación/auto-sync GitHub Pages|generate.yml/auto-sync-ad507.yml leen action=list y copian códigos; patch-ad507-2026.sh adapta plantilla/enlaces|Publicadores/consumidores de códigos, no evidencia de asignación nueva; no alterados|
|PLANES44, formularios y altas manuales|Proyecto autoridad1A6hGG0gTBwZ6L6yHOqrf9k7Q7KtUa8MonInL3Nmsh8JSG0Bll_n8Tj4Z. Editor real devolvió Acceso denegado / Necesitas acceso en la cuenta disponible. Repositorio no contiene fuentes .gs|ROJO: no se revisó el generador ni triggers/version44 o todos los emisores manuales; no declarar inventario completo ni garantía futura|

Snapshot maestro40códigos y PGtotal0 conservados como evidencia previa, no releídos ni diagnosticados nuevamente. La garantía verificable disponible impide colisiones dentro del nuevo sistema y con el registro histórico consultado en cada reserva, pero exige registro legible vigente y contrato de emisores externos. El lector canónico existente sigue sin validación positiva del contrato action=list; no sustituirlo por un snapshot estático ni afirmar reserva global. Gate AD507_HISTORICAL_NAMESPACE_VERIFIED continúa cerrado.

Acción exacta del propietario: facilitar acceso SOLO lectura al proyecto PLANES identificado mediante una cuenta que ya sea propietaria/autorizada, o exportar únicamente las funciones de asignación/normalización/altas y listado de triggers/emisores de versión44, sin secretos ni datos personales. Incluir las altas manuales autorizadas. Revisar si todas excluyen N32; si no existe exclusión, documentar y comprometer la reserva operacional de ese namespace para todos los emisores, sin editarExcel/AppsScript. Un contrato no probado no se activa. No se pulsó Solicitar acceso ni se enviaron mensajes.

### Recuperación: procedimiento oficial verificado

Fuentes oficiales leídas11octubre:
- https://docs.railway.com/volumes/backups (How to restore / Caveats).
- https://docs.railway.com/guides/postgres-backups-restores (capas, PITR y restore drill).

VERDE: mecanismo soportado identificado. Snapshot de volumen se restaura al mismo servicio/proyecto/ambiente; Restore prepara otro volumen en el montaje original y Deploy aplica el cambio/reinicia servicio. No es restauración aislada permitida aquí. La referencia de volúmenes dice que los snapshots posteriores permanecen en el volumen anterior, mientras la guía resume que se eliminan: por esa discrepancia no asumir su conservación sin confirmar con soporte ni ejecutar Restore.

PITR soporta un Postgres hermano sin tocar fuente, pero estaba desactivado: habilitarlo ahora no recupera el snapshot11octubre11:39. Requiere bucket/variables/redeploy y consumo; no habilitado ni recomendado como sustituto de ESTA prueba.

pg_dump custom + pg_restore en destino aislado es el ensayo lógico soportado, pero un dump actual NO verifica el snapshot existente. No se ejecutó pg_dump ni Restore, no se creó base de ensayo en el servidor productivo, servicio, bucket o volumen. No se solicita instalar herramientas para esta revisión.

ROJO (snapshot real): las fuentes/UI no documentan exportación o clonación de ESE snapshot a otro servicio sin sustituir montaje; no inventar esa capacidad. Acción exacta propietario: consultar soporteRailway con proyecto2b6d4e6c-e1d4-471d-a77d-c9bdb711650d, Postgresce124693-1fef-432f-9824-e315d5cabd9d, volumen9cccf287-430d-43f3-8f12-d1cd0d3670bb y snapshot2026-10-11T16:39:30.690Z/245MB: «¿Puede exportarse o clonarse este backup a un destino aislado, sin preparar/reemplazar montajelive ni redesplegar producción? Indiquen procedimiento soportado y costo mínimo del ensayo». No se envió solicitud en nombre del propietario. Antes de cualquier creación: revisar respuesta, presupuesto/retención, autorizar operación concreta; restaurar con misma versiónPG18, verificar ledger/checksums/conteos/restricciones sin PII, registrar tiempos e integridad y cerrar solo destino autorizado. Hasta entonces recuperación ROJO.

### Natalie: reutilización real preparada en código

AMARILLO (preparada, sin despliegue): commercialEntryHtml reutiliza una lectura estática cacheada por proceso del index.html existente los tres fragmentos de widget (estilo/HTML/script), sin clonarlo en otra implementación ni modificarindex. Docker incluye ese archivo solo como fuente estática de extracción; no lo sirve como segunda aplicación. Falta de marcadores rechaza render en vez de fabricar otrochat. Misma identidadcontrolada, endpoints y contrato de sesión; sin DB/proveedor en renderer. Script delwidget se integra dentro del único script de página, conservando nonceCSP. connect-src admite solo self y el hostHTTPSCore que ya usaNatalie; no wildcard ni relajación de roles/CORS/backend.

Panamá ywww507 reutilizan el script exacto; LATAM/preview/hostmalicioso muestran launcherdesactivado y no ejecutan llamadasNatalie porque backend existente no acepta esos orígenes. Se mantiene independencia del teléfono; WhatsApp no participa en sesión/conversación. No se afirma función privada exclusiva delpropietario, historial entre dispositivos ni capacidad LATAM fuera del conocimiento aprobado.

Pruebas: rendererPA/LATAM, unwidget/un script, script original y JavaScript sintácticamente válido, nonce/CSP, cuenta/ADMIN intactos; simulación local de dos consultas con una sesión y respuestas mediante textContent, cero llamadasalproveedor real. Esto es VERDE de contrato aislado, no VERDE de respuesta productiva. Prueba positiva existente sigue AMARILLO: requerirá alcance designado y autorización de consumo/estado si corresponde. LATAM sigue AMARILLO/ROJO antes de activar: mismo backend deberá aprobar origen/escope y conservar límites, sin otra autenticación ni asistente. No alterarlegacy en este encargo.

### Dominios/OAuth: continuidad preparada sin cambios productivos

VERDE de revisión/contrato: sharedCommercialRoot intercepta únicamenteGET / con gates explícitos y hosts exactos; no toma códigos antiguos, assets, APIs o callbacks. Navegación de país permanece en el mismo documento; no promete conservar File/cookie al navegar entre dominios. URLs nuevasPA y extranjeras mantienen los dominios aprobados; QR usa URLcanónica. Códigos históricos y Pages siguen intactos.

ROJO de activación: DNS no enruta por path. No apuntar todo direcciones507.com aCore hasta acreditar cómo se sirven también las rutas/archivos históricos. Reutilizar únicamente el frente de enrutamiento existente si puede hacerlo selectivamente; si no existe, no inventar proxy/infraestructura ni activar raíz. direcciones.lat debe registrarse en el servicio existente para obtener sus propiosCNAME/TXT antes de DNS/TLS; no reutilizar TXT507.

OAuth real: una configuración de redirect/success/origen; cookies host-only Secure HttpOnly SameSite=Lax. general-auth.ts rechaza un host diferente con AUTH_ORIGIN_DENIED incluso con x-forwarded-host falso. Prueba negativa añadida usa authactual y mocks que fallan si se consultaSQL/proveedor. No cambiar producción ni crear SSO/authnuevo; documentado que activarlat DNS no conecta Mi cuenta automáticamente. Se necesita autorizar/verificar la configuración compatible del MISMOauth para amboshosts (callback/state/CSRF/roles/logout), con pruebas aisladas antes de activación. No transportar cookies/tokens porURL ni compartir dominio de cookie entre507.com ylat.

### Autorizaciones mínimas y estado de entrega

No pedir otra autorización para revisar fuentes o el diagnóstico ya completado: falta acceso de lectura aPLANES, no permiso deSQL. Snapshot requiere respuesta de soporte/método aislado y luego presupuesto autorizado si aplica. WidgetPA queda preparado enPR52; ensayo productivo con estado/proveedor y activaciónCORSLATAM necesitan autorización posterior. DNS/configuraciónOAuth/DDL/merge/deploy permanecen prohibidos. PR51 intacto; no nuevoADMIN/auth/DB/almacenamiento/publicador ni pagos activados. CI final de esta preparación se registra en descripción dePR52.


## Continuación autorizada desde6c345e8 — preparación aislada de OAuth y Natalie

Esta sección actualiza los puntos pendientes y sustituye el requisito anterior de raíz comercial507: la instrucción más reciente exige CONSERVAR la página principal histórica. No se ejecutó de nuevo el diagnósticoPostgreSQL ni se releyó el maestro.

|Punto pendiente|Estado actual y evidencia|Qué falta realmente|
|---|---|---|
|Lectura PLANES/emisores|ROJO: además de Necesitas acceso en editor, fetch autorizado del proyecto medianteDrive devolvió403/FORBIDDEN. No .gs en repo ni fuentes deversión44/triggers accesibles|Cuenta con permiso Lector sobre proyecto1A6hGG0gTBwZ6L6yHOqrf9k7Q7KtUa8MonInL3Nmsh8JSG0Bll_n8Tj4Z. No hace falta permisoEditor niDeploy. Triggers deotros usuarios pueden requerir evidencia/exportación delpropietario de cada trigger; lectura no garantiza inventario completo|
|Exclusividad futura|ROJO: snapshot40/PG0 y pruebas N32/PLACE conservados. No fuentes suficientes para generadores/triggers/manuales|Revisión/exportación de funciones emisoras y canales manuales, contrato probado de exclusiónN32 y lectorcanónico válido. No activar gate por estadística actual|
|Snapshot11octubre|ROJO: consulta oficial confirma Restore estándar, no clonación/exportación aislada de ESE snapshot. API documenta List/Create/Restore/Lock/Delete, sin procedimiento de exportación acreditado|Respuesta de soporte sobre extracción/clon aislado y costo concreto. No ejecutar mutationRestore ni montar volumenlive para investigar|
|Natalie en dos entradas|AMARILLO: mismo widget ybackend preparados para507 yLATAM, con gateexacto AD507_INTERNATIONAL_DOMAIN_VERIFIED. Mismo scriptHTTPS, sesióncontrolada, identidad, provider ylímites. No llamadas reales|DNS/TLS/origen verificado y aprobación de activación posterior; prueba positiva designada sin afirmar alcanceprivado/datosentre dispositivos. No nuevoasistente|
|OAuth dosdominios|AMARILLO: un createGeneralAuth, mismoGoogleclient/secreto/DB/roles, callbacks explícitos y estado/token vinculadoaorigen; LATAM cerrado por defecto|Registrar callbacklat en elmismoGoogleOAuthclient, configurar variables solo tras autorización, validar físicamente. NoSSO automático ni compartir cookies entre dominios|
|Raíz507 y entradaLATAM|VERDE de preservación, AMARILLO deactivación: raíz507 nunca interceptada por sharedCommercialRoot. EntradaLATAM comparte renderer, rootLATAM requieregates. ComercialPA preparado en /commercial/panama concanonicalpropia|Enrutamiento del pathPA mediante frenteexistente ylatmismoservicio; no cambiosDNS/Pages/históricos. No nuevaaplicación ni duplicación|

### OAuth preparado y pruebas que deben pasar

Configuración primaria existente intacta cuando LATAM no está configurado. Segunda configuración solo si AD507_INTERNATIONAL_DOMAIN_VERIFIED=true y AD507_GOOGLE_REDIRECT_URI_LATAM=https://direcciones.lat/auth/google/callback; AD507_AUTH_SUCCESS_URL_LATAM por defecto/predeterminado /panel, validado en el mismoorigen. El mismoclientGoogle debe registrar elcallbacklat antes deactivar. No valoressecretos nuevos, servicios, tablasni migraciones.

El origen se selecciona solo por URLhost exacto y callbackconfigurado; headersproxy no crean destinos. StateLATAM sehashea conorigen; estadosprimarios mantienen hash anterior. Cookies Secure/HttpOnly/SameSite=Lax yhost-only. Tokensnuevos firmados llevanorigen; tokensprimariosanteriores sinorigen continúan aceptados soloenprimario. No se aceptan enLATAM. Roles siguenPostgreSQL yOAuth no otorgaADMIN. Logout/CSRF revoca sesión propia, sin consumir la delotrodominio. MismoGoogleSub resuelve una solaidentidad/usuario enDBcentral, con sesionesseparadas porhost. No afirmar SSOsilencioso o continuidad deFile entrehosts.

Pruebas añadidas enPG aislado: callbacks deamboshosts, login/mismaidentidad/CLIENT, statecruzado rechazado sin consumir primario, cookiecruzada rechazada, compatibilidad de tokenprimarioanterior, replay/CSRF/roles existentes, logout independiente. ConfiguracionesHTTP/userinfo/hostmalicioso/pathincorrecto/redirecciónexterna rechazadas. ProveedorGoogle simulado, no transacciones ni credencialesreales.

### Natalie: configuración de origen dentro del mismo backend

La única modificación delbackendlegacy candidato está en la extensionseam aprobada: al arrancar agrega el origenexacto https://direcciones.lat a NATALIE_ALLOWED_ORIGINS SOLO con AD507_INTERNATIONAL_DOMAIN_VERIFIED=true. check-legacy y su prueba comparan elresto EXACTAMENTE consnapshot; no modificarlegacy.snapshot.txt. Session/conversation/Residential/analytics/knowledge/provider/ratelimits siguenoriginales. Sin wildcardCORS, sinotroauth ni ampliar herramientas/permisos/conocimiento.

Widgetreutilizado paraLATAM conelmismogate; por defecto desactivado. PreflightOPTIONS contra Bun yPG AISLADOS debeaceptar latverificado yrechazar hostparecido para sesión/conversación, sin crear sesiones ni llamarIA. Seconserva scriptHTTPS yfuncionamientoindependiente delteléfono. LogoutdelpanelLATAM retorna asupropiaentrada; panelPA conserva comportamiento. Respuesta real/proveedor no certificada porOPTIONS.

### Recuperación y costo consultados, sin operaciones

Fuentes oficiales adicionales: https://docs.railway.com/integrations/api/manage-volumes y https://docs.railway.com/pricing/plans (Resource usage pricing). Tarifascontainers: volumenUS$0.15/GB-mes; RAMUS$10/GB-mes; CPUUS$20/vCPU-mes; egressUS$0.05/GB. Se factura según uso; no confundir estas tarifas con cotización de recuperar el snapshot. Para ese ensayo no se conoce tamaño final/tiempoCPU/RAM ni método soportado. NO existe precio final acreditado, ni presupuesto aprobado, ni recursoscreados. Los245MB listados no prueban tamañofinalrestaurado ni coste total.

Consulta que necesita respuesta delpropietario/soporte: con losIDs y fecha registrados previamente, confirmar mecanismo soportado de extracción/clon al destinoaislado SIN Restore/montajelive/redeploy; pedir costo y retenciónmínimos. No seenvía mensaje ni secontrata soporte premium en este encargo. Una copia lógica nueva podría ensayarse, pero no verifica elrespaldo11octubre yno se ejecutó.

### Autorizaciones pendientes

1. Facilitar permiso Lector aPLANES o fuenteexportada sinsecretos y evidencia detriggersemisores; noautorizarEditor ni cambioshistóricos.
2. Obtener procedimiento/cotización deRailway; autorizar operaciónaislada/costo solo después de esa respuesta.
3. Posteriormente: registrar callbacklat yhostRailway, variables/gates de configuración yDNS/TLS autorizados; validación física deOAuth/Natalie en la plataformaúnica, con presupuestoIA si la prueba tiene consumo.
4. Solo tras exclusividad/recuperación/routing/verificaciones: DDLordenado/merge/deploy/activación autorizados. Ninguna deestas acciones fue realizada. El diagnósticoREADONLY permanececonsumido, nopermite repetición.

CI final deestecommit y sus límites se registran en el reporte único dePR52; PR51 permanece7535f2c. No declarar operativo lo preparado.
