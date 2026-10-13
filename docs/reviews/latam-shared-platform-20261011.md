# Direcciones LATAM: una plataforma, dos dominios

Decisión del propietario del 11 octubre 2026. Sustituye la propuesta anterior de dos entradas comerciales independientes: son alias/contextos de una sola interfaz y un solo backend. No se reconstruye ADMIN, autenticación, solicitudes, orders, publicación ni R2.

## Arquitectura implementada en este PR

Una aplicación Bun en los servicios existentes → PostgreSQL central (country_code, prefijo y request_data coherentes) → bucket privado direcciones507-media. ADMIN y CLIENT conservan los roles/sesiones existentes. La ficha comercial reutiliza ad507.template.html con Direcciones LATAM azul arriba/abajo; históricos no cambian.

commercialEntryHtml reutiliza exactamente userPanelHtml/formulario y sus scripts. La interfaz pública preparada añade identidad Panamá/Direcciones507, selector de país, servicios existentes, navegación Panamá/internacional y marca LATAM. Cambiar país navega dentro del documento mediante history, sin borrar campos ni objetos File, sin transportar datos personales en URL/localStorage. El formulario mantiene validación de territorio y teléfono por país desde el servidor. El visitante puede explorar países preparados; publicación y cobros extranjeros siguen rechazados. No se inventan precios extranjeros; Panamá usa su autoridad vigente.

La raíz compartida se prepara con AD507_SHARED_COMMERCIAL_ENTRY_ENABLED=true, desactivado por defecto. Solo intercepta GET / de direcciones507.com o direcciones.lat; el segundo requiere además AD507_INTERNATIONAL_DOMAIN_VERIFIED=true. No admite dominios parecidos ni usa X-Forwarded-Host como autoridad. /AD507-..., assets, APIs y auth no se interceptan. /commercial/panama e /commercial/international son alias del mismo renderer, no páginas/copias mantenidas por separado. /panel y /admin permanecen.

Las respuestas de preview permanecen noindex, nofollow y no-store; los metadatos preparados identifican correctamente cada dominio y conservan Direcciones507 en Panamá. No se afirma que estas rutas ya estén conectadas a los dominios reales.

## Dos dominios y límites actuales

|Contexto|Interfaz/código|URL de dirección nueva|Activación|
|---|---|---|---|
|direcciones507.com|Interfaz compartida, PA predeterminado, identidad Direcciones507|https://direcciones507.com/AD507-.../|Autorización y cierre PR51|
|direcciones.lat|Misma interfaz; PA por defecto, selector internacional|https://direcciones.lat/AD57-.../, AD506-..., etc.|Adquisición, dominio y pruebas primero|
|País extranjero visto desde Panamá|Cambio de contexto en el mismo documento|No se entrega enlace público activo|País comercialmente cerrado|

Navegar entre contextos no cambia de aplicación ni recarga el formulario. **Cruzar realmente de dominio no conserva automáticamente cookies ni objetos File:** son orígenes distintos. No se implementa transferencia insegura de archivos/sesiones con query strings, CORS abierto ni un segundo auth. El auth actual está limitado a un único origen/callback verificado. Antes de abrir el segundo dominio se debe elegir y validar un ingreso canónico compartido o ampliar de forma explícita el mismo flujo OAuth con allowlist de callbacks/sesiones host-only. Esa tarea está pendiente; la navegación local no acredita autenticación internacional operativa.

## Conservación histórica y Google

No se modifica index.html, plantilla fuente, GitHub Pages, QR, Excel, Apps Script, PLANES 44, directorios AD507 históricos, assets ni Search Console/Business. No hay migración masiva ni redirect global.

Ruta de activación pendiente: decidir y autorizar una regla selectiva de entrada para GET / que sirva el backend nuevo, preservando el destino actual de todos los paths históricos y assets; probar precedencia y ausencia de colisiones con códigos nuevos antes de DNS/proxy. Si la plataforma productiva no permite esa división sin alterar históricos, no activar la raíz: resolver el routing con el propietario. Preparar esta función no cambia GitHub Pages ni acredita entrega real de nuevas fichas bajo el dominio Panamá.

Después de verificar dominio/routing/auth: permitir indexación solo de las entradas aprobadas y fichas ACTIVE/comerciales elegibles; conservar URLs/canónicos históricos exactos; canónico de PA en direcciones507.com y países extranjeros en direcciones.lat. Evitar indexar aliases /commercial y parámetros country de preview. Generar sitemaps por origen/country únicamente de publicaciones activas autorizadas, sin duplicar todas las fichas en ambos dominios; declarar cada sitemap en su propiedad Search Console. Registrar y probar robots/canónicos/metadatos, mantener Google Business Panamá y sus enlaces vigentes. Sitemaps internacionales y sus comprobaciones **aún no están conectados**. No editar propiedades ni indexación productivas en esta etapa.

## Escalabilidad implementada y preparada

- ADMIN direcciones/solicitudes/lugares: una consulta paginada con cursor (timestamp exacto de seis decimales + UUID), 50 por defecto/100 máximo por página, sin OFFSET ni máximo acumulado. País opcional validado por servidor y ligado al cursor. Requests preserva orden de creación ascendente; otras listas usan actualización descendente. UI Cargar más conserva filas/eventos previos. Counts indican tamaño de página, no total ficticio.
- Panel de usuario: misma paginación de direcciones, ligada por SQL al usuario autenticado. No cambia permisos. Pedidos siguen acotados a los 100 más recientes; paginación de pedidos/usuarios y búsqueda textual avanzada siguen pendientes si el volumen lo requiere.
- Propuesta scalability-indexes.sql después de countries.sql: índices de página global/país y parciales requests/places. Mantiene UNIQUE(code), normalized-code, hashes de idempotencia e índices de país/estado existentes. No SQL productivo ni modificación de migraciones históricas. Reversión de aplicación mantiene datos; para revertir índices, revisión autorizada de DROP INDEX sin borrar tablas/columnas. DDL de creación es transaccional y puede bloquear: antes de release, revisar tamaño real y usar ventana controlada o procedimiento CONCURRENTLY independiente si la medición lo justifica.
- Pool compartido sigue max=2, con conexión 5s, idle 30s, vida 1800s, statement 15s y locks 5s. No se aumentan conexiones sin medir el presupuesto PostgreSQL × réplicas. La prueba usa max=2; un pool pequeño puede convertirse en cola bajo carga.
- Backend no persiste imágenes/estado crítico en disco. Transacciones, advisory locks, hashes, órdenes y auditoría existentes conservan idempotencia entre réplicas. Rate limiting de solicitudes y panel usa identidad autenticada, sin agrupar familias/negocios por una IP de proxy. Los mapas locales de ventana no son un límite global entre réplicas y conservan un techo de entradas; medir/adaptar ese control antes de una difusión de alta concurrencia. No se añade Redis/colas por anticipación.
- R2 mantiene un bucket y el firmador/autorizador existentes. Nuevas fotos extranjeras usan countries/CO/addresses/<UUID>/... (análogos demás países); Panamá y objetos anteriores conservan addresses/<UUID>/... para no romper reintentos/claves históricas. Upload comprueba país contra PostgreSQL; lectura/eliminación requieren vínculo, propietario/ADMIN y país de clave coherente. Intent persiste antes de PUT; un fallo incierto conserva referencia recuperable y no borra objetos existentes. No hay diagnóstico físico R2 nuevo. Reconciliación de intents antiguos permanece procedimiento explícito, no limpieza automática.
- Medios privados siguen no-store. Una futura caché de imágenes comerciales públicas debe comprobar ACTIVE/visibilidad y definir invalidación en suspensión; no hacer bucket público ni cachear auth/residencial. No implementada todavía. Optimización Sharp es síncrona dentro del envío, 8 MB/formatos/límites de píxeles existentes; solo separar trabajo si mediciones de fotos demuestran necesidad.

## Pruebas reproducibles y criterios

scalability.test.ts usa exclusivamente AD507_TEST_DATABASE_URL localhost del PostgreSQL desechable existente de Actions. Rechaza hosts remotos y nunca usa DATABASE_URL. Crea DB aleatoria propia, aplica SQL real/propuestas solo allí, inserta 1k → 10k → 100k sintéticos y elimina exclusivamente esa DB al finalizar. Sin R2 real ni datos clientes.

Ejecutar desde core/runtime: AD507_TEST_DATABASE_URL=<Postgres localhost aislado> bun test tests/scalability.test.ts. Mantener esa base separada de cualquier dato real; la variable no se toma de producción.

Cada etapa: 40 páginas por país + 40 lookups de código; p50/p95/p99, tamaño real de tabla/índices, tiempos de inserción, plan EXPLAIN ANALYZE/BUFFERS, ausencia de repetición entre páginas y consistencia país/status. Al final, 10/25/50 tareas concurrentes, tres consultas por tarea, con QPS y latencias incluyendo espera de pool; conexiones verificadas ≤2. Registra CPU/modelo/memoria total del runner, RSS de Bun y versión PG. No mide CPU/RSS del proceso PostgreSQL ni tráfico HTTP/fotos reales. Muestras cortas/caché caliente no son una prueba sostenida de producción.

Interrumpir si p95 de página >500ms, p95 concurrente >1000ms, etapas >30s o total de benchmark >40s; cada SQL tiene timeout 5s/lock 2s. Test total 45s; Actions conserva límite global90s. Umbrales son criterios de este escenario de consultas, no SLA de formulario/publicación.

Proyección 1M = 10 × tamaño real medido de addresses con índices a 100k. **Estimación, no capacidad comprobada.** Descripciones sintéticas de 512 caracteres, referencias simples y request_data vacío no representan fotos, usuarios, auditoría, pedidos, WAL, bloat, diversidad de búsquedas o memoria. No se insertan 1M ni se certifica simultaneidad de visitantes/formularios. Resultados finales y run verificable se registran en el PR; no declarar el benchmark aprobado antes de CI.

Siguiente medición, antes de ampliar: HTTP completo con sesiones sintéticas, persistencia/media simulado, latencia de uploads y saturación Sharp/pool/egress; query plans de búsqueda real y lista del propietario a gran volumen; tasa de auditoría/pagos; carga sostenida y recuperación. No está ejecutada en este PR. No hay ampliación de infraestructura.

## Costos orientativos, no compras

Fuentes oficiales consultadas 11 octubre: https://docs.railway.com/pricing y https://developers.cloudflare.com/r2/pricing/. Railway publica RAM US$10/GB-mes, CPU US$20/vCPU-mes y volumen US$0.15/GB-mes; R2 Standard US$0.015/GB-mes, operaciones A US$4.50/millón y B US$0.36/millón, egress R2 sin cargo. Aplican plan/créditos, redondeos, operaciones e impuestos; egress del backend Railway no es egress gratuito R2.

Ejemplos aritméticos: 10 GB extra de volumen ≈US$1.50/mes; consumo sostenido adicional de 1 GB RAM +1 vCPU ≈US$30/mes; 100 GB de R2 Standard ≈US$1.50/mes antes de créditos, más operaciones. No son factura ni recursos recomendados/contratados. Capacidad fotográfica requiere medir tamaños procesados reales y distribución por plan; no inventar un promedio. El costo de un millón de registros se obtiene del tamaño observado y recursos medidos, no de multiplicar número de visitantes por almacenamiento.

## Dependencias y checklist

- [x] #51 cierra regresión: commit 7535f2cdaa38b475538769fa5d90c31a38134713, Actions 38176202779 SUCCESS, 96 pruebas/0 fallos/1085 aserciones, PostgreSQL y Docker. No se modifica después del encargo de esta etapa.
- [x] Una interfaz, identidad Panamá, selector/navegación sin recarga, aliases y raíces detrás de gates.
- [x] Canonical por dominio preparado; históricos y plantilla fuente intactos; previews noindex.
- [x] Paginación ADMIN y direcciones propias; propuesta de índices; límites de pool/SQL.
- [x] Organización R2 extranjera con autorización y claves PA previas conservadas.
- [x] Benchmark aislado reproducible implementado; resultados finales sujetos a Actions.
- [ ] Acreditar exclusividad histórica AD507-N, recuperación del snapshot existente y ledger/schema real de #51.
- [ ] Autorizar integración/DDL/release #51 y posteriormente #52; mantener propuestas sin aplicar.
- [ ] Adquirir/verificar direcciones.lat, routing selectivo de ambos dominios, mismo auth/callback autorizado, sitemap/robots y pruebas SEO.
- [ ] Ejecutar carga HTTP sostenida/fotos y observabilidad operativa antes de afirmar capacidad pública masiva.
- [ ] Sandbox real, listener/reconciliación y condiciones bancarias antes de pagos; Yappy/PayPal reales siguen apagados.

No merge, deploy, DNS, secretos, SQL productivo, recursos adicionales, cobros, nuevas aplicaciones ni cambios históricos. Preparado no significa operativo comercialmente.
