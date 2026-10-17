## PR101 — automatización de vigencias y entrega, 17 octubre 2026

- Estado: IMPLEMENTADO y PROBADO en PostgreSQL18 aislado; NO OPERATIVO.
- CI266/39007921689 SUCCESS sobre f037ca3: compilación Bun/Docker, legado y
  suite completa PASS. Refinamiento final de reembolso/flags con CI en el PR101.
- Rama existente feat/plan-expiry-renewal-20261017; mismo PR101. Un Core.
- Implementados períodos de planes, entrega por outbox, avisos15/7/1/vencimiento,
  reserva indefinida de identidad, beneficios calculados en lectura y renovación
  voluntaria contra orders/pago verificado. Sin cobros automáticos.
- ADMIN: contadores y filtros; Mi cuenta: fechas/renovación; QR generado en Core.
- Propuesta SQL plan-lifecycle.sql separada; sin ejecución productiva/backfill.
- Correo preparado con soporte@direcciones507.com; sin envío real ni activación.
- Documentación: docs/plan-automation-configuration-20261017.md con flags,
  prerequisitos SQL/pagos, política configurable y lista de activación.
- CI inicial detectó fixture con pool multiconexión ejecutando BEGIN de las
  migraciones: ajuste a pool1 solo para preparación, pool5 para concurrencia.
  Prueba visual anterior esperaba Lugar aunque main ya publica Lugar Gratis;
  expectativa actualizada al texto existente, sin cambiar producto.
- PENDIENTE productivo: revisión comercial de períodos, esquema autorizado,
  proveedor de correo/pago y prueba real de entrega/vencimiento/renovación.
- Sin Excel, Apps Script, Pages, fichas históricas, SQL/variables/despliegue real.

# Checklist maestro de cierre — Direcciones507 + LATAM

## Encabezado Panamá — corrección puntual,16 octubre2026

El propietario confirma generación y apertura recuperadas tras026d31a.
Esta intervención se limita al encabezado de index.html; sin cambios backend,
fichas, códigos/URL, OAuth, paneles, pagos, solicitudes, DB/R2 o archivos históricos.

- Causa del duplicado: el selector general :is(.btn-nav-action,...) posterior
  imponía display:inline-flex sobre .mobile-account-link; coexistían dos enlaces.
- f3fbe6d: eliminado el enlace duplicado; permanece un único Mi cuenta con URL
  original https://direcciones.lat/?country=PA&access=1. Registrar mi Dirección
  conserva su destino y papel de acción principal; callbacks de navegación intactos.
- CSS circunscrito a #mainAppHeader: textos nowrap, logo/eslogan alineados,
  botones44px con padding10x13px, separación18px. Navegación en una fila desde
  1180px; por debajo, botón Menú accesible con aria-controls/aria-expanded,
  desplegable de dos columnas; una columna hasta359px. Sin comprimir etiquetas.
- Pruebas locales:10PASS/0FAIL; cuenta única/destino original, abrir/cerrar menú,
  compilación sintáctica de todos los scripts inline y diff --check PASS.
- CI38913527941 SUCCESS sobre f3fbe6d:184PASS/0FAIL/2888 expectativas;
  PostgreSQL aislado, generación/apertura, compatibilidad, Bun y Docker PASS.
- Despliegue/aceptación pública registrados en #82 y PR62 tras integración.
  Vista desktop se comprueba con navegador. La aceptación física tablet/móvil
  debe distinguirse de la implementación de media queries; el navegador de prueba
  no permite cambiar viewport. No se afirma prueba física de dispositivos reales.

## INCIDENTE — recuperación de publicación, 16 octubre 2026

Este registro sustituye la afirmación anterior de activación bloqueada como un
estado aceptable: be4e02b introdujo una REGRESIÓN en el generador que funcionaba.
createNewAddressPublication.reserve exigía productNamespaceExclusive=true;
server.ts lo calculaba de AD507_PRODUCT_CODE_NAMESPACE_VERIFIED, ausente en
producción. Por tanto toda solicitud sin código fallaba ANTES de reservar, con
PRODUCT_CODE_NAMESPACE_NOT_VERIFIED. No era un cambio de diseño ni caída de DB.
La nueva compuerta no debía sustituir al asignador anterior ya autorizado.

- CORRECCIÓN MÍNIMA026d31ab98b64200c2fee572d3bebca92c88ddeb: restaurado
  únicamente el asignador N32 de ed30bec y su conexión en server.ts. Se conserva
  AD507_HISTORICAL_NAMESPACE_VERIFIED, lector histórico, comparación normalizada,
  consulta PostgreSQL, índice único e idempotencia. Sin activar numeración/nombres
  nuevos. No se cambian códigos/URL ya asignados, datos, fotos, pagos o permisos.
- CI38911328966 SUCCESS:184PASS/0FAIL/2888 expectativas; recorrido HTTP aislado
  con OAuth, envío→ADMIN→aprobación→publicación→URL/QR/foto/Mi cuenta, más ediciones
  y permisos. Bun/Docker/legacy/validación de migraciones PASS. No ejecutar DDL.
- DESPLEGADO: Railway3df5227c-b716-4fc1-ad64-1cdc374dd82a SUCCESS sobre026d31a.
  Comprobación posterior: portadas507/LATAM, ready y ficha nueva200; ADMIN200,
  session-check401 sin sesión (denegación correcta); logs de este deploy sin errores.
- Antes de corrección: ambas portadas200 y ficha nueva existente200 con datos;
  R2WebP200 y1254px decodificados. No hubo caída global. Logs disponibles muestran
  panel autenticado del propietario200; no hay POST de publicación del incidente
  en la ventana recuperada. La regresión se acredita por código y reproducción
  del contrato, sin inventar una publicación productiva autenticada.
- Bloqueo separado: https://direcciones507.com/AD507-ARTEMARY/ y versión minúscula
  devuelven404 de GitHub.com/Pages; THE1920 minúscula también404. Artemary404 ya
  constaba en registros anteriores a be4e02b. AD507-0025/0001 abren páginas de acceso
  residencial (no fichas comerciales). No se modifican Pages/históricos para
  disimular estos resultados ni se certifican los40 negocios como disponibles.
- PENDIENTE físico/autenticado: Mi cuenta/ADMIN y una nueva solicitud real hasta
  publicar con sesión del propietario. Navegador disponible sin sesión. No crear
  comercios sintéticos ni elevar roles productivos para fabricar evidencia.
- Desarrollo de formatos, edición adicional, pagos y mejoras visuales suspendido
  mientras se verifica la recuperación. No se repiten respaldo ni migraciones.

## Edición gratuita y códigos por producto — 16 octubre 2026

Base reutilizada: ed30bec; continuación de PR #62 y #82, misma rama existente.
Commit funcional be4e02b57306da7f8c3de895a346ebb6040abf1c integrado en main
mediante fast-forward. No PR, panel, generador, migración ni recurso nuevo.

| Función | Estado | Evidencia / alcance |
|---|---|---|
| Edición cliente Negocio/Lugar | Probado y desplegado; físico pendiente | Botón Editar en ficha/detalle. Solo OWNER activo; servidor vuelve a comprobar propiedad y rol. Datos, horario, referencia, contacto, redes según plan. Código, URL y plan inmutables. Sin pago ni orden. |
| Edición ADMIN Negocio/Lugar | Probado y desplegado; físico pendiente | Mismo editor en detalle existente, rol ADMIN consultado en PostgreSQL. Edita registros nuevos ACTIVE publicados. Históricos/importados y Residencial conservan sus procesos existentes. |
| Logo/portada/fotos | Probado y desplegado; físico pendiente | Cuotas actuales: negocio un logo; Pro hasta5 fotos; Lugar1–4 fotos. Selección de conservar/reemplazar y primera foto nueva como portada. R2 usa optimización/firmante existentes; intención auditada antes de PUT. Fallo de PUT conserva ficha y fotos anteriores. Objetos anteriores conservados para recuperación; asociaciones y snapshot cambian atómicamente. |
| Cambios públicos / Mi cuenta | Probado en PostgreSQL aislado | Lectores existentes ven nuevos datos/media; al guardar se recarga detalle/panel. Control de versión rechaza escritura obsoleta. No se modificaron datos reales para fabricar una prueba productiva. |
| Traslado solicitado | Probado y desplegado; físico pendiente | Coordenadas finitas dentro de rango. Cliente crea pendingLocation; ubicación vigente se conserva. ADMIN aprueba/rechaza con versión e identificador de solicitud; edición directa ADMIN valida/publica ubicación y audita. |
| Historial | Probado y desplegado; físico pendiente | audit_log existente con antes/después/actor/fecha; vista Historial de cambios autorizada para titular o ADMIN. Últimos100 eventos visibles; registro completo conservado. |
| Nuevos códigos por producto | Implementado y probado; ACTIVACIÓN BLOQUEADA | Gratis8 dígitos; Premium/Pro/Lugar nombre normalizado, acentos/puntuación eliminados, duplicados con sufijo y consulta SQL/registro histórico. Unicidad PostgreSQL y reintentos siguen activos. Códigos publicados no cambian. |
| Protección histórica | Activa | AD507_HISTORICAL_NAMESPACE_VERIFIED conservada. La evidencia anterior cubría N32, no numeración ni nombres. Nueva compuerta AD507_PRODUCT_CODE_NAMESPACE_VERIFIED ausente/no activada. Falta acreditar exclusividad de los formatos numérico/nombre frente a TODOS los emisores históricos y los40 códigos, incluidos no listados; lectura de listado no demuestra ausencia de futuras escrituras. No basta reutilizar la prueba de separación N32. Sin esa evidencia no activar compuerta ni generar códigos largos como alternativa silenciosa. |
| Descripción breve | Probado y desplegado | Formulario/edición/servidor/ficha pública: solo Pro y Lugar. Datos históricos persistidos no se borran. Adaptador de importación conserva campos originales sin aplicar retroactivamente esta regla. |
| Solicitudes cliente / ADMIN | Reutilizado y probado | Detalles, fotos y estados existentes conservados; no reconstrucción visual. |
| Automáticas | VERDE | Actions38909186445 SUCCESS,183PASS/0FAIL/2876 expectativas; PostgreSQL18 aislado, Bun1.4.0, build Bun/Docker, legacy y validación de migraciones PASS. Prueba nueva verifica propietario ajeno, rol falso, versión obsoleta, ubicación, reemplazo/fallo R2, historial, lectura pública y cero órdenes. |
| Railway funcional | DESPLEGADO | 03e4ab49-184f-4b88-b9bb-9ca64d9ad3e5 SUCCESS,main be4e02b. /health200 ok:true, /ready200 database:true/authConfigured:true; ficha AD507-N56F413FACAAA475589AB112BC1EFC9A3 sigue200 con código original. |
| Prueba física | PENDIENTE | Navegador disponible redirige panel a acceso; sin sesión cliente/ADMIN. En tablet: editar negocio y Lugar, cambiar logo/portada, guardar y abrir ficha pública, consultar historial, pedir traslado y aprobar/rechazar desde ADMIN. No se afirma recorrido autenticado productivo ni aceptación móvil/tablet. |

Restricciones cumplidas: sin Excel, Apps Script, Pages históricos, migración de40,
OAuth/redirecciones, pagos, nuevos recursos/costos, respaldos repetidos ni DDL.
No se declara operación completa de edición hasta la prueba autenticada; nuevos
formatos de código permanecen bloqueados por evidencia de exclusividad pendiente.

## Cierre visual Mi cuenta — continuación82,16 octubre2026

- CONFIRMADO POR EL PROPIETARIO: generación, Copiar código y Abrir dirección
  funcionan; soporte portada+3 adicionales implementado, Railway y177 pruebas
  aprobados. No se reconstruyen ni se crean solicitudes para repetir esa prueba.
- IMPLEMENTADO: nombre/código y acciones antes de la foto; estado arriba a la
  derecha, controles en grid con detalle separado y código completo sin renombrar.
  Tarjeta compacta de dos columnas en tablet/desktop y una en móvil; se reduce
  anidación del formulario y se centra ©2026 Todos los derechos reservados.
- IMPLEMENTADO: Mi cuenta y Google/correo transportan país al panel compartido.
  OAuth liga contexto de país al state/binding de un solo uso; acepta únicamente
  países configurados y destino fijo /panel. ADMIN conserva intención /admin y
  consulta real de rol; no se concede acceso administrativo por contexto cliente.
  Entrada Panamá al panel compartido conserva país válido. Sin destinos externos.
- PROBADO local:131PASS/0FAIL,1escalaoptativaSKIP,1027 expectativas;
  build Bun, scripts inline y diff --check PASS. Prueba nueva CI cubre ocho países,
  logout/reingreso, eliminación/cambio de cookie y separación ADMIN/cliente.
- PROBADO EN CI:38852897102 SUCCESS,180PASS/0FAIL/2765 expectativas,
  HEAD funcional fd859c5. Bun/Docker/legacy/inlineJS/diff PASS. Se probaron retorno
  ADMIN sujeto a rol, detalle cliente/ADMIN, ocho países, logout/reingreso y
  rechazo de contexto alterado. El fixture nuevo reemplaza una cookie ADMIN
  vacía para simular correctamente una única cookie manipulada.
- VERIFICADO EN PRODUCCIÓN: copyright LATAM computado center; Google y Mi cuenta
  enlazan con country=CR conservado; viewport1363px sin overflow horizontal.
  Se detectó y corrigió salto anónimo http detrás de Railway: destino fijo HTTPS.
- DESPLEGADO: ef15efc2-226d-4459-9223-e231bc33f668 SUCCESS parafd859c5.
  Prueba pública posterior: cuenta507/panel?country=CR devuelve302 hacia panel
  LATAM conCR; panel anónimo devuelve302 hacia https://direcciones.lat/?country=CR&access=1.
  No hay descenso aHTTP ni pérdida de país. Cambios registrados en #82 y PR62.
- PENDIENTE: selección manual de cuenta Google para comprobar callback real de
  la versión nueva y aceptación visual de tarjeta por propietario en tablet/móvil.
  El retorno ADMIN ya fue probado físicamente antes y sigue cubierto en CI;
  no se declara repetida esa prueba autenticada en esta continuación.
- CONTINÚA POSTERGADO: filtro de Lugares por país/provincia; no implementado.
  Sin cambios en fotos, cuotas, históricos, Excel, Apps Script, pagos o migraciones.

## Tarea82 — panel cliente y cuatro fotos de Lugares,16 octubre2026

- IMPLEMENTADO sobre main ddbb539f911df6fc1fd30e4f906a7d53a7b3266f:
  tarjeta compartida compacta, una etiqueta de tipo, nombre destacado, estado
  arriba a la derecha, código completo con ajuste seguro y Copiar código.
  Abrir dirección digital y Ver detalles son controles separados y accesibles.
- IMPLEMENTADO: botones uniformes, Actualizar visible también en LATAM,
  columnas sin ancho mínimo que desborde móvil, formularios sin revisión vacía.
  El aviso de panel en preparación se oculta solo al recibir activación real.
- IMPLEMENTADO: portada obligatoria y0–3 fotos adicionales para PLACE.
  FormData envía portada primero; servidor exige1–4 fotos y R2 limita a4 bajo
  el bloqueo existente. Una foto histórica sigue válida. Sin migración ni datos.
  ADMIN etiqueta portada/adicionales; ficha pública reutiliza fotos ordenadas,
  galería y lightbox actuales, sin cambiar la plantilla pública.
- IMPLEMENTADO: logout conserva direcciones.lat y país válido seleccionado;
  mantiene revocación y controles existentes. No acepta destinos arbitrarios.
- PROBADO local:129PASS,1 prueba de escala optativa omitida,0FAIL,
  1011 expectativas; build Bun, scripts inline, legacy y diff --check PASS.
  Suites PostgreSQL se ejecutan en CI aislado (no hay DB local disponible).
- PROBADO EN CI:38850437248 SUCCESS sobre22516cc,177PASS/0FAIL,
  2665 expectativas. PostgreSQL aislado, cuatro fotos/portada/quinta rechazada,
  permisos, reintento idempotente y publicación PASS. Builds Bun/Docker PASS.
  Primer run detectó expectativa vieja de etiqueta ADMIN; test actualizado
  al texto ya publicado, sin alterar lógica para satisfacer la prueba.
- DESPLEGADO: Railway27593317-d30b-46b6-b022-0f295039940b SUCCESS,
  main c462256. Código funcional idéntico a22516cc probado en CI.
- OPERATIVO comprobado en navegador: formulario Lugar muestra portada requerida,
  tres adicionales y cuatro en total; Actualizar visible; aviso obsoleto oculto.
  Panel desktop1363px sin overflow horizontal y revisión vacía oculta.
  Cierre real de sesión tras elegirCR volvió a https://direcciones.lat/?country=CR;
  se mostró Costa Rica/+506, sin activar publicación ni cobros extranjeros.
  Core/health y dirección existente de una foto responden200.
- PENDIENTE FÍSICO: cuenta cliente titular para comprobar su tarjeta real,
  copiar código y revisión visual en teléfono/tablet. La sesión disponible era
  ADMIN sin direcciones propias. No se transfieren propietarios ni se crean datos
  productivos para fabricar esa evidencia. Responsive por CSS y acciones se
  probaron en suites; no se afirma una prueba física completa de tres dispositivos.
- No se modifican códigos, Excel, Apps Script, pagos, QR ni esquema productivo.
  Prueba de4 fotos usa solo datos sintéticos y almacenamiento simulado aislado.

## Continuación ADMIN y primera publicación — 15 octubre 2026

- OPERATIVO: retorno OAuth a /admin, rol ADMIN real de ventas@direcciones507.com,
  apertura desde Lugares y aprobación real verificados en navegador.
- Solicitud56f413fa-caaa-4755-89ab-112bc1efc9a3 aprobada/publicada ACTIVE:
  AD507-N56F413FACAAA475589AB112BC1EFC9A3. Sin otra fila, cambio de código ni pago.
- Primer intento mostró fallo genérico; reintento idempotente confirmó ACTIVE.
  Diagnóstico seguro añadido en91e0884: tipo/código/frame, sin payload/SQL/secretos.
  No se atribuye una causa no demostrada a ese fallo inicial.
- Bloqueo real posterior: URL .com nueva404 (Pages histórico), mientras el mismo
  código en direcciones.lat devuelve la ficha. Corrección general: nuevas URLs,
  QR/copy y fotos usan el Core HTTPS direcciones.lat; códigos/país/marca no cambian.
  Importaciones con URL original mantienen .com. Sin DNS, Pages ni Apps Script.
- Adaptador existente: PLACE utiliza su foto IMAGE como imagen de identidad
  cuando no existe LOGO; negocios conservan LOGO. No modifica plantilla ni diseño.
- PENDIENTE: CI/despliegue de entrega canónica y validación pública final de foto,
  QR, Maps/Waze y Mi cuenta con la misma solicitud. Histórico y pagos intactos.


## Correcciones operativas de panel — 15 octubre 2026, prueba tablet

- OPERATIVO según prueba del propietario: Lugar guardado; cliente En revisión y
  ADMIN PENDING_REVIEW. Ya no es pendiente de envío inicial. Sin duplicar registro.
- PROBADO EN CI: OAuth desde ADMIN admite únicamente returnTo=/admin, liga la
  intención a state/binding y vuelve a /admin solo tras consultar rol ADMIN real.
  Login general conserva destino; no alta/elevación de roles. Logout ADMIN vuelve allí.
- OPERATIVO EN PRODUCCIÓN: ficha USER_REQUEST real abre detalle dentro del panel existente,
  con texto seguro, ubicación, foto privada y estado. Rutas de lectura reutilizan
  repository.read y autorización R2; terceros reciben404 y clientes no moderan.
- PROBADO EN CI: Lugares ADMIN enlaza el visor openRequestReview existente con
  aprobar/rechazar/publicar según estados y permisos ya definidos.
- PROBADO local:8 tests,0 fallos,42 expectativas; JS renderizado y buildBun PASS.
  PostgreSQL aislado local bloqueado por permisos de creación/cambio de usuario;
  Actions38835272301 SUCCESS:171PASS/0FAIL/2609expectativas, Bun/Docker/legacy PASS.
  Ensayos nuevos usan cuentas independientes; fallo inicial de contaminación de
  fixtures corregido. No se cambió comportamiento para adaptar las expectativas.
- PR62 ya MERGED; continuación sobre su misma rama desde main3623e3f. Se amplía
  el trigger push del workflow existente a esa rama para comprobar cambios posteriores
  al merge sin duplicar PR. No se repiten respaldo/migraciones/R2 aprobados.
- DESPLEGADO: main f136c1e102566eef933e25b06c30ee530fe0becb, Railway
  51cfdeab-62de-4219-8ee6-38c63b493a16 SUCCESS. Commits funcional1b52b20 y fixturef136c1e.
  Prueba física: sesión cliente existente, tocar ficha abre descripción, referencia,
  tipo, estado, país/divisiones, coordenadas y enlace Google. Foto R2 cargada y
  decodificada1254x1254, mostrada a360px sin deformar. Sin nuevo envío ni cambios de datos.
- PENDIENTE: login manual ADMIN ventas@direcciones507.com para comprobar retorno
  real de Google y revisión desde Lugares; aprobar/publicar la solicitud real y
  comprobar URL/QR/Mi cuenta. No se declara publicada. Pagos siguen desactivados;
  histórico intacto. Los resultados posteriores se registran en conversación PR62.
- MEJORA FUTURA, SIN IMPLEMENTAR: filtros de Lugares por país, provincia y divisiones
  administrativas correspondientes a cada país. No bloquea esta activación.


## Activación ejecutada — 15 octubre 2026, 23:11 UTC

Esta entrada sustituye los bloqueos de acceso, merge y activación descritos más abajo;
no sustituye la prueba productiva autenticada pendiente.

- PLANES: acceso real con la cuenta del propietario. Código.gs versión44 leído
  desde historial, idéntico al HEAD leído: consulta/listado y track/stats;
  escrituras solo de contadores/fecha/encabezados de contadores. Sin emisión,
  inserción ni importación de códigos. Activadores visibles del propietario:0.
  Proyecto vinculado al Máster oficial. Ninguna ejecución ni modificación Google.
- Contrato operacional del propietario: toda emisión nueva corresponde a Core;
  histórico sin emisión nueva e incorporación únicamente manual conservando código.
  N32, cotejo histórico vivo por reserva e índices únicos se conservan. Esto no
  pretende impedir modificaciones manuales de un editor autorizado del Máster.
- PR62 integrado: main 62c6fecd85e53e88e172d41f6c8301430f71f2fd.
  Se reutiliza Actions38785672494 SUCCESS,166PASS/0FAIL; sin rerun manual.
- Railway production ad507-core: deployment323cc395-3edc-414c-9777-80b89509c621
  SUCCESS, commit62c6fec. Activados únicamente AD507_COMMERCIAL_WORKFLOW_ENABLED,
  AD507_HISTORICAL_NAMESPACE_VERIFIED y AD507_R2_CONFIGURATION_VERIFIED.
  R2/respaldo/migraciones aprobados no repetidos. Pagos permanecen apagados;
  planes de pago requieren confirmación real y países no validados permanecen cerrados.
- Verificación pública posterior: LATAM/Core /ready200 con database:true y
  authConfigured:true; muestra histórica /AD507-0025/200; ADMIN sin sesión401.
- PENDIENTE real: prueba con sesión del propietario/ADMIN y datos/logo reales:
  solicitud → revisión → aprobación → código → publicación → R2 → QR → Mi cuenta.
  No se creó una dirección sintética ni se declara operativo ese recorrido.
  Inicio Google detenido por revisión automática para respetar la entrega manual
  exigida por el propietario. Se requiere su inicio de sesión en LATAM.


## Ejecución operativa — 15 octubre 2026, continuación

| Componente | Estado | Evidencia / siguiente dependencia |
|---|---|---|
| Respaldo lógico actual | Probado | pg_dump completo restaurado sin errores en ad507_restorecheck_20261015 dentro del mismo PostgreSQL; 43 tablas AD507 y hash de datos idéntico. Backup persistente en volumen existente; no es un ensayo del snapshot físico ni de pérdida del volumen. |
| Migraciones comerciales | Aplicado | releases/20261015-commercial-schema.sql: hash verificado, ensayo aislado PASS, COMMIT productivo PASS; cuerpos existentes reutilizados y ledger 0006–0008 atómico. Sin payments.sql. |
| Esquema/ledger productivo | Probado | Postconsulta: ledger 0000–0008, ocho columnas comerciales, cuatro índices comerciales, cero constraints sin validar y cero direcciones igual al inicio. No se cambiaron datos históricos. |
| Exclusividad de códigos | Pendiente | Falta evidencia del contrato de emisores históricos; AD507_HISTORICAL_NAMESPACE_VERIFIED permanece sin activar. |
| R2 | Probado previamente | Se reutiliza evidencia aprobada; no se repite ni se activan permisos nuevos. |
| Core actual | Operativo para servicios existentes | Deployment 6d5821d6-ff4b-4b14-a99d-85f962ae0937 SUCCESS sobre main d0113d6. No demuestra creación/publicación nueva. |
| Circuito nuevo productivo | Pendiente | Sin activación, merge ni publicación de prueba; después de exclusividad: propietario/ADMIN prueba completa, URL/QR/foto/Mi cuenta/compartir/Maps/Waze. |
| Pagos y países adicionales | Cerrados | Sin Yappy/PayPal ni apertura de países sin configuración. |

Registro detallado: docs/reviews/panama-production-execution-pr62.md.
PR único: #62. Se conserva la evidencia de 166 PASS/0 FAIL del HEAD c93f0d6;
no se atribuye ese resultado al SQL preparado ni a producción.
Incidencia de consola recuperada; transferencia completa y hash comprobado antes
del ensayo. CI #203: test C05 antiguo esperaba WebP; main PR81 usa PNG aprobado.
Se ajusta solo ese test al cambio publicado: focal 6 PASS/0 FAIL, diseño intacto.

## Continuación funcional del generador — 15 octubre 2026

Base real inspeccionada: main `1cef22758c3528353a6bf29e40bb83b80708dac0`.
Se continúa PR #62, rama `fix/panama-panel-publication-20261012`, incorporando
main sin revertir el diseño aprobado. No se crea otro panel, Core ni PR.

| Componente | Estado | Evidencia / pendiente exacto |
|---|---|---|
| Formulario → receptor persistente | En desarrollo | El formulario existente usa `/v1/user/requests`; panel y receptor están cerrados por `AD507_COMMERCIAL_WORKFLOW_ENABLED`. No es una ruta de envío inexistente. |
| ADMIN → aprobación/publicación | Probado en fixture previo | Reutiliza `request-routes.ts` y `request-repository.ts`; falta recorrido autenticado productivo. |
| Separación pago/publicación | En desarrollo | `server.ts` exige confirmación productiva aun con Yappy apagado. Gratis no consulta órdenes; Premium/Pro sin confirmación quedan pendientes. No se activa proveedor ni se altera precio. |
| Iglesia Catedral | En desarrollo | Nombre usado exclusivamente en el ensayo HTTP aislado existente; imagen y coordenadas sintéticas identificadas como fixture. No se crea registro público ni se inventan datos reales del lugar. |
| Ocho países / generador único | Probado en configuración | PA, CR, CO, GT, SV, HN, NI, MX comparten configuración y formulario. `assertCountryCommerce` solo admite PA. Los otros siete NO se declaran operativos ni se abren sin configuración comercial suficiente. |
| Producción | Operativo solo para servicios actuales | Railway ad507-core: SUCCESS `ff0c79d9-f76c-4e61-ae5e-546058c1777c`, sin staged; `/ready` LATAM/Core 200. La variable comercial no está definida. Esto no acredita publicación comercial. |
| Esquema y exclusividad | Pendiente | Sigue vigente el preflight de PR62: columnas comerciales/country_code, recuperación aislada del respaldo y exclusividad histórica deben acreditarse antes de activar. No se aplica SQL, no se declara namespace verificado ni se cambia flag. |

Archivos funcionales de esta continuación: `core/runtime/server.ts`.
Pruebas: `tests/publication-errors.test.ts` y el ensayo existente en
`tests/consolidated.test.ts`, ahora con el mismo control de pago de producción.
Compatibilidad legacy y compilación PASS. La suite local sin PostgreSQL accesible
da 121 PASS, 1 skip y 3 fallos de prerrequisitos de PostgreSQL; la certificación
completa corresponde a Actions con PostgreSQL aislado. No confundir ese resultado
local con un fallo comercial verificado ni con producción operativa.

Antes de publicar de verdad: cerrar evidencias pendientes, autorizar/aplicar el
esquema verificado y activar el flujo; después el propietario envía Iglesia
Catedral con sus datos y logo reales y ADMIN revisa, aprueba y publica. Comprobar
URL, QR, Maps/Waze y la tarjeta en Mi cuenta desde ambos dominios. No ejecutar
esa prueba con datos sintéticos en producción.

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
|Raíz507 y URLs históricas|VERDE|Página principal/Pages yarchivos históricos intactos. Candidato8689e4e no intercepta root507, incluso congate; pruebas aprobadas conservadas|Enrutamiento del NUEVO pathcomercialPA pendiente, sin reemplazar raíz ni redirigir históricos|
|direcciones.lat adquirido|VERDE|Confirmación expresa del propietario en encargo de cierre|No equivale aTLS/DNS/hostRailway conectado|
|Conexiónlat/DNS preparados|AMARILLO|Mismo servicio/puerto8080 identificado. lat no está registrado; no hayCNAME/TXT propios emitidos|Autorizar registro de hostname en servicio existente para obtener valores específicos; DNS aún prohibido. No copiarTXT507|
|OAuth / Mi cuenta Panamá (CI)|AMARILLO|Mismoauth, sesiones, identidad, rolesADMIN, CSRF y ownership enActions; no se duplican cuentas|Origen productivo/callback efectivo se revisa en activación; valores secretos no publicados|
|OAuth / Mi cuenta entre dominios|AMARILLO|Candidato8689e4e: mismoauth/identidad con callbacks explícitos, state/tokens pororigen y cookieshost-only; Actions38185952778 SUCCESS127/0. Producción conserva versión anterior|Falta configurar callbacklat en elmismoclienteGoogle y verificar ingreso real tras autorización. NoSSO automático ni tokens porURL|
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
|PLANES44, formularios y altas manuales|Proyecto autoridad1A6hGG0gTBwZ6L6yHOqrf9k7Q7KtUa8MonInL3Nmsh8JSG0Bll_n8Tj4Z. Editor real devolvió Acceso denegado / Necesitas acceso en la cuenta disponible. Repositorio no contiene fuentes .gs|ROJO: falta contrato de generadores/triggers/emisores manuales FUTUROS. Identidad, código lector y despliegue44 ya registrados el10octubre; no reabrirlos ni declarar inventario completo|

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


## Avance hacia activación desde8689e4e — evidencia adicional sin repetir pruebas

Cambio exclusivamente documental. Se conserva la evidencia127/0,1970aserciones,20archivos, Actions38185952778 SUCCESS sobre8689e4e. No nuevo test, rerunCI, diagnósticoPG, roundtripR2, conversaciónIA o lectura masiva delmaestro. El commit documental utiliza [skip ci] para respetar la instrucción de no repetir pruebas; no atribuirle una nueva ejecuciónCI.

### Barrera de emisión comprobada por lectura del código actual

VERDE (garantía de bloqueo, no exclusividad histórica): server.ts calcula namespaceExclusive SOLO con AD507_HISTORICAL_NAMESPACE_VERIFIED==='true' y pasa ese valor al adaptador. request-repository.ts publish verifica canonical.historicalRegistryVerified===true ANTES de sql.reserve(), locks, consultas o escritura delcódigo. Si falta, CANONICAL_PUBLICATION_NOT_READY. new-address-publication.ts reserve comprueba namespaceExclusive ANTES del lectorPLANES y SQL: HISTORICAL_NAMESPACE_NOT_VERIFIED. El acceso directo al adaptador tampoco evita la barrera. No añadir otroallocator ocontrol duplicado, ni activar el existente con evidencia insuficiente.

La preparación de solicitudes sin código no equivale aemisión; la aprobaciónADMIN noelimina elgate. UNIQUE ynormalización siguen como barreras adicionales deDB, sin atribuirles garantía frente aescritoreshistóricos externos. PLANES permaneceROJO por la evidencia reciente editorNecesitasacceso/Drive403: falta permisoLector deproyecto oexportación deasignadores/version44/triggers y canalesmanuales. No se solicitaron permisos ni se tocaron históricos. La lectura delproyecto no acredita por sísola triggers instaladospor otrascuentas.

### Lectura nueva de Railway, sin secretos

ad507-core b0da9f70-7790-4729-a728-aaa4aa3f571d, proyecto2b6d4e6c-e1d4-471d-a77d-c9bdb711650d, production909fdec4-8930-4405-ae53-6e8fb0d3f901: deployment e43bec48-2518-41bc-814a-a99da78eb6c4 SUCCESS, staged:null. Solo nombres devariables, no valores: AD507_HISTORICAL_NAMESPACE_VERIFIED ausente; AD507_INTERNATIONAL_DOMAIN_VERIFIED ausente; AD507_GOOGLE_REDIRECT_URI_LATAM ausente. Por ello no hay confirmación deexclusividad ni activaciónLATAM/callback secundaria enproducción. CandidatoPR52 no desplegado.

Dominios delmismoservicio existentes: direcciones507.com, www.direcciones507.com, cuenta.direcciones507.com y ad507-core-production.up.railway.app, puerto8080. direcciones.lat ausente. No se registróhost, cambióDNS/TLS, variable oservicio. No afirmar valoresDNSlat hasta que Railwaylos emita.

### Configuración exacta preparada para revisión posterior

|Elemento|Valor/procedimiento preparado|Estado|
|---|---|---|
|GoogleOAuthlat|Registrar https://direcciones.lat/auth/google/callback en elmismoclienteGoogle actual; no otrocliente/auth|AMARILLO: sin cambiosCloud/credenciales|
|Callbackbackendlat|AD507_GOOGLE_REDIRECT_URI_LATAM=https://direcciones.lat/auth/google/callback|AMARILLO: variable actualmenteausente|
|RetornoMi cuentaLATAM|AD507_AUTH_SUCCESS_URL_LATAM=/panel, validado enorigenlat|AMARILLO: preparadocandidato|
|Origen primarioPanamá|Conservar config primaria vigente; confirmar su callback público y routing real antes de cualquier activación. No asumir valorsecretamente leído ni sustituirlo ahora|AMARILLO: pruebas127 aprobadas, configuraciónproductiva sin cambios|
|HostLATAM|Registrar direcciones.lat en ad507-core/production, puerto8080, obtenerCNAME/TXT específicos y validarDNS/TLS|AMARILLO: operaciónprohibida hasta autorización; sin crearotraapp|
|GatesLATAM|AD507_INTERNATIONAL_DOMAIN_VERIFIED=true solo DESPUÉS deDNS/TLS/origen comprobados; AD507_SHARED_COMMERCIAL_ENTRY_ENABLED controla raízlat; root507 sepreserva|AMARILLO: ningunaactivación|
|Natalie|Mismo widget/script/backend; origenlat condicionadoalmismogate, sesionesHTTPS y alcance/límites conservados|VERDE integraciónaislada127; AMARILLO respuesta real/activación|
|EmisiónAD507|NO establecer AD507_HISTORICAL_NAMESPACE_VERIFIED hasta revisar TODOS los emisores ylectorcanónico|ROJO exclusividad, VERDE bloqueoactual|

Respaldo11oct2026-10-11T16:39:30.690Z/245MB: identificaciónconservada, recuperaciónaisladaROJO. Procedimiento/IDs/consulta soportada ya documentados; no nuevos debates/tarifas/storage ni recursos. Solo falta respuesta concreta sobre cómo recuperar ESE snapshotaislado sin montaje/redeploylive; autorización de una operación/costo se decidirá después, no autorización genérica deRestore.

Verificaciones Natalie/OAuth de código ydesarrollo quedan cerradas con las127 aprobadas; no repetirlas para obtener otroverde. Lo que queda es físico/configuraciónautorizada y evidenciasexternas. Sin desplegar el candidato no puede certificarse su funcionamiento productivo. Mantener estas filasAMARILLO hasta pruebasreales; no exigir teléfonoWhatsApp paraNatalie ni añadir identidad/asistente paralelo.

### Qué puede continuar y qué requiere intervención

Sin afectarproducción: revisar fuentePLANES si elpropietariofacilita lectura/exportación; cotejar evidencia detriggersemisores; evaluar respuesta desoporte sobre snapshot; revisar los valoresDNSqueRailway emita cuando suregistrose autorice. Estas revisiones no requieren nuevo permisoSQL, otrodiagnóstico o nuevasfunciones.

Intervenciones concretas: (1) LectorPLANES/exportación y evidencia deemisores; (2) respuesta deRailway de recuperaciónaislada; (3) posteriormente autorizar callback/host/configuración/DNS/TLS yprueba real designadaGoogle/Natalie con costo si aplica; (4) DDL/merge/deploy solo tras resolverbloqueos yautorización. No nuevasautorizaciones para repetir trabajo completado. PR51 intacto, una arquitectura central ypagosapagados.


## Intervenciones externas — procedimiento breve

Evidencia nueva: búsqueda Drive autorizada PLANES/mimeAppsScript no devolvió proyectos accesibles. No usar este vacío para inferir que no existen; persisten editorNecesitasacceso/Drive403. Google documenta que proyectos vinculados heredan permisos delcontenedor y que cada cuenta solo ve sus propios triggers instalables. Fuentes: https://developers.google.com/apps-script/guides/collaborating y https://developers.google.com/apps-script/guides/triggers/installable.

Propietario: abrir proyectoPLANES identificado con su cuenta autorizada, confirmar implementación44 y facilitar las funciones emisoras/normalización/altas/listado sin secretos. Proyecto independiente: compartir archivoAppsScript comoLector; vinculado: permisos heredados delcontenedor. No asegurar que compartir lector delmaestro siempre permite vercódigo; si eleditor no permite lectura, exportar/copiarsolo fuente necesaria desdecuentapropietaria en un documentoLector, sin concederEditor ni ejecutar funciones. Revisar Desencadenadores (reloj) con cuenta que los creó; aportar función/evento/frecuencia, y evidencia deotrascuentas si hay más emisores. Indicar altas manuales existentes. No modificarcompartición delhistórico ni ampliarpermisos automáticamente.

Railway: documentación https://docs.railway.com/platform/support confirma Central Station como canal oficial y Private Threads paraPro; no soporteemail ni contratación adicional. Entrar https://station.railway.com con cuentaRailway, crear consulta privada sobre proyectoamused-enchantment/production/Postgres, proyecto2b6d4e6c-e1d4-471d-a77d-c9bdb711650d, snapshot2026-10-11T16:39:30.690Z/245MB. Pedir procedimiento soportado y costo de extracción/clonaislado sin sustituir montaje ni redesplegarfuente. NoRestore, Deploy, PITR, recursos o servicios contratados. RecuperaciónROJO hastarespuesta/pruebareal. Noenviada por asistente.

Checklist FUTURO (no ejecutar hoy): [ ] autorización/configuración dominio/callback trasbloqueos; [ ] identidad/roles/Micuenta ylogout correctos enamboshosts; [ ] Natalie una solasesiónHTTPS por conversación, respuesta real ycontrol3mensajes enPanamá/LATAM; [ ] URLs/QR/home/indexación históricos intactos; [ ] no pagos/publicaciónextranjera sin autorización. Prueba positivaIA con costo debeautorizarse previamente. EmisiónAD507 siguebloqueada. 127pruebas/diagnósticos no repetidos.


## Consolidación de evidencias10–11octubre — sin repetir trabajo

Corrección documental de alcance: el10octubre23:08/23:10UTC (18:08/18:10Panamá) YA se registró revisión segura de PLANES vinculado alMáster, código y despliegue44. Su conclusión: lectura de direcciones/contadores, sin reserva idempotente/asignación concurrente ni endpoint de publicación de altas acreditados. Se recuperó el reporte previo; NO se volvió a abrir/revisar versión44. La ausencia actual deacceso al editor no invalida esa identificación/revisión anterior. No pedir alpropietario repetir elección dePLANES,44,40códigos oPG.

Accesos existentes aprovechados: búsquedaDrive PLANES SIN limitarse a mimeAppsScript localizó maestro, respaldos ydocumentación. No se abrieron maestro/respaldos ni se releyeron sus códigos. Se leyeron documentos accesibles 04_Base_de_Datos_y_Datos_Maestros_v0.3 (ID1GcOnUjtiI6mB6Qs1-cEZy-KUCB8CcO7M), 01_Expediente_Maestro_Direcciones507_v0.4 (ID1XyWZEBHoppZhD55v6KuKX56aXuRK2-As) y 05_Automatizaciones_e_Integraciones_v0.3 (ID1WIay85Ocs3xXQwEoTEq3OTxp02aDNoMk). Son documentos históricos fechados13sept, no certificación de infraestructura actual.

Nueva evidencia recuperada: Automatizaciones distingue explícitamente el proveedor AppsScript action=list del pipelineGitHub que normaliza y genera PÁGINAS. No identifica funciones que ASIGNAN códigos ni inventario completo deemisores/triggers. Los documentos remiten a procesos vinculados al maestro, pero no contienen unaexportación ejecutable deesos emisores. La documentación deNatalie distingue frontend/web, backend/PG, IA yplantilla n8n inactiva/placeholders; no activar/reconstruir n8n ni confundirla con el backendHTTPS actual ya probado. No se modificaron documentosDrive ni se inspeccionóotroproyecto.

### Única evidencia de emisión futura que falta

- Lista de TODOS los canales que pueden escribir/asignar la columnaCódigo AD507 en elfuturo, incluidos formularios/triggers, scripts separados yaltasmanuales.
- Nombre/fuente de cada función asignadora y reglas de normalización/formatos que puede producir. No toda la auditoría dePLANES44 otra vez.
- Cuenta creadora y función/evento/frecuencia de cada trigger que invoca esos emisores; evidencia individual si pertenecen aotrascuentas.
- Regla verificable que excluya ^AD507-N[0-9A-F]{32}$ en TODOS esosemisores, o evidencia de que ya no emiten altas y lasnuevas pasan exclusivamente por la plataforma central. No asumir que se desactivaron canales antiguos.

Estos cuatroelementos no aparecen en las fuentes recuperadas. Tener listaactual sincolisiones, PLANESlector y127pruebas no sustituye este contrato futuro. ExclusividadROJO; bloqueo previo aemisiónVERDE conservado. AD507_HISTORICAL_NAMESPACE_VERIFIED no se activa. El lectorcanónico requerido por cadareserva continúa convalidaciónpositiva pendiente; no se reemplaza porregistroestático.

Intervención acotada, solo si no existe fuente ya accesible: propietario facilita lectura/exportación de ESASfunciones y listado deemisores/triggers/manuales; no pedir otra revisión44 ni lecturamasiva delmaestro. Si sefacilita fuente podemos cotejarla sinSQL/despliegue/modificaciones. No solicitarEditor/Deploy automáticamente; usar cuentaautorizada/exportación sinsecretos.

### Continuidad de pendientes reales

Recuperación del snapshot11octubre: IDs/fecha/procedimiento y canalCentralStation conservados, no búsquedasgenerales/Restore/nuevosrecursos. Falta respuesta deRailway sobre método soportado de extracción/clonaislado de ESEsnapshot sin montar/redeploylive. Esees elbloqueo, no tamaño/capacidad ni otra compra.

Natalie/OAuth/dosentradas: código8689e4e y127aprobadas conservados; no funcionesnuevas, testsrepetidos, llamadasGoogle/IA reales oconfiguraciónproductiva. Una plataforma/ADMIN/DB/identidad; sesionespororigen; homepage507 preservada yentradaLATAM opt-in. ConservarNatalie comoasistente delpropietario con backendexistente, sin asignarleprivilegios/tareasnuevas. Validaciónreal pendiente debe comprobar acceso delpropietario, widget enambasentradas, sesiónHTTPS/límites ylogout; no afirmar privacidadexclusiva/continuidadentre dispositivos noacreditada por la identidadcontrolada actual.

Soloautorizacionespendientes: acceso acotado aemisores si siguefaltando; procedimiento/costo concreto deRailway antes de recuperar; después callback/host/configuraciónDNS/TLS yvalidaciónrealdesignadaGoogle/Natalie con consumoautorizado siaplica. DDL/merge/deploy permanecenprohibidos. No pedir nuevo permiso dePG ni repetir127. Commitdoc [skip ci]; evidenciaverde delcódigo8689 no cambia.


## Avance funcional: recorrido HTTP integral y entrega conectada

Hallazgo concreto: la publicación existente confirmaba ACTIVE/código y la ficha compartida ya producía URLcanónica/QR/copiar/compartir, pero la revisiónADMIN y las tarjetas Mi cuenta no contenían un enlace a esa ficha. Se conecta únicamente eseúltimo tramo; no otropublicador, mensajería, QR o asistente.

Corrección: request-repository.read y adminAddressPage reutilizan proposedCountryUrl para devolver publicUrl SOLO si elregistro nuevo comercialPA está ACTIVE y tiene publication_receipt. Nunca borrador/suspendido/residencial/paísextranjero. Las consultas paginadas proyectan receipt/originalUrl solo para calcular enlace y no exponen esos campos internos ni agregan N+1. OriginalURL de traslado validada conelmismopatrón histórico existente: host507HTTPS ypathcódigo original minúsculo, sincredenciales/query/hash. No se renumeran históricos.

ADMIN yMi cuenta muestran Abrir ficha,enlace yQR, apuntandoalrenderer/ficha existente; allí seutilizan QR/copiar/compartir yaimplementados. No se envían mensajes/email/WhatsApp automáticamente. Recepción delcliente es mediante su panelautenticado. Fichas/QR/datos anteriores sin cambios.

Prueba nueva preparada en tests/consolidated.test.ts: BunHTTP local yPG aislado existentes; OAuth real demódulo conGooglesimulado; proveedoresR2/PLANES simulados conredexterna inesperada rechazada. Solicitudmultipart/logooptimizado → persistencia/reintento sin duplicado → ADMINrevisión mediante script UIexistente → aprobación → publicación503 congatecerrado (código/URL siguenNULL) → confirmaciónEXCLUSIVAMENTEsintética defixture → ACTIVE → enlacecanónico enADMIN/Mi cuenta → GETfichaHTTP200 → payloadQR/copiarcanónico → GETimagenWebP200 → retry publicaciónúnico. Colombia: formulario/ADMIN/fotos/revisión funcionan; publishse detiene exactamente con503 COUNTRY_NOT_ENABLED ysin código/URL. Noactivar país para pasarprueba.

Se ejecuta regresión delcambioconcreto y la nueva integral eninfraestructuraCI existente; la prohibición anterior de repetir127 sin cambios no exige omitir validación deestacorrección funcional autorizada. Resultados finales se registran enPR52. Navegadorreal/tablet, Google/R2/PLANES/productorIA yDNSproductivos no certificados por elharness: transportelocalHTTP simulaURLedgeHTTPS, sesionesHTTPS deconfigcandidate/headers contratadas, noTLSrealnuevo. ScriptADMIN se ejecuta conDOMmínimo de prueba yHTTP real local; no esprueba visualnavegador.

Natalie/OAuth/países quedanimplementadosen8689e4e, conservados; ninguna funcióndeNatalie nueva. Emisores futuros/lectorrealPLANES yrecuperaciónsnapshot siguenROJO deactivación, no bloqueanestafaseaislada. Evidencia recuperada del10–11oct yconsulta soportadas no se repiten ni se amplían permisos. Producción/DNS/DDL/merge/deploy/cobros permanecenintactos.

La ejecución 38191592597 encontró EADDRINUSE en el puerto fijo del runtime aislado antes de ejecutar el recorrido. Se sustituye exclusivamente ese puerto de pruebas por uno disponible; no cambia ningún puerto ni servicio productivo. La repetición está justificada por este fallo nuevo del entorno.


### Evidencia nueva de cierre funcional — 12 de octubre, 01:28 UTC

Commit funcional validado: `72a6cf9118c0550ebfa0447be3c09adb858f996e` (corrección de entrega en `1ba3bb98a48c0e0f98b7904097af5a58504f8197`). GitHub Actions [38191973535](https://github.com/direcciones507/direcciones507/actions/runs/38191973535): SUCCESS; 129 pruebas, 0 fallos, 2023 aserciones, 20 archivos, 8.01 s. Validación de migraciones, protección legacy, compilación y Docker aprobados. La primera ejecución falló antes del recorrido por EADDRINUSE; el runtime de pruebas ahora selecciona un puerto disponible.

| Punto pendiente | Estado | Evidencia / límite |
|---|---|---|
| Conexión publicación → entrega en ADMIN y Mi cuenta | VERDE | Ambos reutilizan la URL de la ficha publicada; en borradores, residencial y extranjeros no se entrega enlace. Se preserva la URL original validada en el ensayo de migración individual. |
| Recorrido integral Panamá aislado | VERDE | HTTP local, PostgreSQL real aislado, imagen PNG procesada a WebP, repositorio y rutas existentes: OAuth → solicitud multipart → reintento mismo ID → permiso ADMIN → aprobación → bloqueo 503 sin evidencia → publicación con evidencia sintética → enlace canónico → HTML y QR/copia existentes → lectura de imagen → publicación idempotente. Duración 130.48 ms, no constituye medición de capacidad productiva. |
| Flujo LATAM preparado | AMARILLO | En el mismo recorrido ADMIN crea Colombia y conserva país/teléfono; aprobación funciona; publicación se detiene con HTTP 503 COUNTRY_NOT_ENABLED, sin código ni enlace. No habilita comercio extranjero. |
| Natalie, un solo widget y backend | AMARILLO | Regresión aprobada del widget compartido y CORS del backend existente para origen LATAM exacto verificado. No se ejecutó conversación real ni consumo de IA; siguen pendientes dominio HTTPS y validación funcional real autorizada. |
| OAuth y dos entradas | AMARILLO | Prueba existente aprobada: misma identidad y base de datos, estados/cookies vinculados al origen, rechazo cruzado y continuidad de sesión primaria. Callbacks Google reales y dominio LATAM/TLS permanecen pendientes; no se cambiaron sesiones productivas. |
| Emisión AD507 productiva | ROJO | El recorrido confirma el cierre del control antes de reservar/publicar sin exclusividad verificada. No hay nueva evidencia sobre emisores históricos futuros; se conserva el inventario pendiente y no se repite la revisión de los 40 códigos ni PLANES 44. |
| Recuperación aislada del respaldo del 11 de octubre | ROJO | Sin nueva confirmación de Railway para recuperar ese snapshot en un entorno independiente. No se ejecutó Restore ni se crearon recursos. Mantener la consulta específica ya preparada al soporte. |
| Compatibilidad PR51 / PR52 | VERDE | merge-tree sobre HEAD PR51 7535f2cdaa38b475538769fa5d90c31a38134713 y PR52 72a6cf9118c0550ebfa0447be3c09adb858f996e sin conflictos. PR51 intacto; una aplicación, autenticación, ADMIN y PostgreSQL. |

Alcance de la prueba: proveedores Google, PLANES y R2 sustituidos por respuestas sintéticas controladas, sin tráfico externo; ADMIN ejecuta su JavaScript real con DOM mínimo de ensayo, sin navegador visual. El QR se valida como URL generada por el mecanismo existente; no se contacta al proveedor externo de QR. No acredita callbacks reales, R2 físico, IA ni rutas/DNS productivos. No se repitió el diagnóstico PostgreSQL. El workflow existente ejecuta su suite completa como regresión del cambio funcional; no se lanzó una auditoría ni prueba de carga productiva.

Intervenciones que siguen siendo necesarias: aportar acceso de lectura o exportación autorizada del inventario de emisores futuros AD507 (funciones, triggers y emisión manual) y evidencia de exclusión del espacio reservado; solicitar a Railway el procedimiento y costo exactos para recuperación aislada del snapshot identificado, sin Restore del servicio activo. Después, autorizar por separado migraciones, dominios/callbacks, validación real de Natalie e integración/despliegue. Ninguna de esas operaciones se efectuó aquí.


## Integración única de generación Panamá + LATAM — decisión 12 octubre 2026

**Estado: EN DESARROLLO (decisión y alcance registrados; NO equivale a código integrado, pruebas ni producción).** Una plataforma, un Core, un generador, una plantilla compartida, un panel Mi cuenta y un ADMIN. No generar nuevas direcciones desde Apps Script/Excel históricos; preservar intactos enlaces y direcciones existentes. Reutilizar PR #51/#52/#62 y componentes existentes antes de escribir código nuevo.

- Países iniciales tomados de INITIAL_COUNTRIES en core/runtime/country-configuration.ts: PA +507, CO +57, CR +506, GT +502, SV +503, HN +504, NI +505, MX +52. PE +51 y EC +593 permanecen FUTURE, sin activarlos.
- Selección de bandera en entrada pública → Crear mi dirección → OAuth Google → Mi cuenta → formulario → ADMIN: conservar countryCode elegido y mostrar automáticamente indicativo telefónico; nunca imponer PA por defecto si hubo selección explícita. El indicativo no reemplaza el identificador único de dirección.
- Un portafolio con habilitación por país. Producto LUGARES únicamente en PA y CR, oculto en CO y demás países. No alterar planes ni precios sin autorización.
- Reservar/publicar códigos por país sin colisiones con históricos; conservar URL canónica y QR; un mismo proceso de solicitud, revisión ADMIN, publicación y entrega. La función assertCountryCommerce actual limita a PA: ampliar de manera controlada solo cuando estén cumplidos los gates de país y producción.
- Preparar interfaz de pasarela de pago desacoplada/configurable por país y producto; no escoger proveedor, solicitar secretos, activar cobros ni confirmar pagos. No confundir espacio de integración con pagos operativos.
- Países futuros deben incorporarse mediante configuración y pruebas, sin duplicar panel, plantilla ni generador.

|Trabajo específico|Estado|Evidencia actual|Cierre requerido|
|---|---|---|---|
|Configuración de ocho países y prefijos|PROBADO EN CÓDIGO|core/runtime/country-configuration.ts contiene INITIAL_COUNTRIES; no prueba productiva|Verificar selector real y persistencia|
|Un único panel/ADMIN/plantilla|EN DESARROLLO|Componentes compartidos existentes; no crear duplicados|Prueba extremo a extremo de cada flujo|
|Selección bandera→OAuth→panel→formulario|PENDIENTE|Regla de persistencia definida; no prueba completa|Validar countryCode e indicativo tras login|
|LUGARES solo PA/CR|PENDIENTE|Regla de producto definida|Pruebas positivas PA/CR y negativas otros|
|Pasarela desacoplada sin cobros|PENDIENTE|Interfaz prevista; pagos actuales apagados|Contrato técnico y pruebas sin transacción|
|Reserva, solicitud, publicación, URL y QR|PENDIENTE|PRs y pruebas parciales ya documentados arriba|Prueba integrada real sin afectar históricos|
|Migraciones/activación producción|BLOQUEADO|Gates de respaldo/exclusividad documentados arriba|Autorización y verificación productiva, no CI solamente|

**Registro de esta actualización:** archivo modificado: core/runtime/RELEASE-CHECKLIST-20261010.md. PR nuevo: ninguno. Pruebas ejecutadas: lectura de configuración y checklist, sin tests de código ni despliegue. Bloqueos: gates de activación existentes; sin modificar Apps Script, Excel, DNS, SQL ni cobros.

### Avance funcional en rama feat/unified-country-generation-20261012

- EN DESARROLLO: `core/runtime/request-validation.ts` ahora rechaza solicitudes `PLACE` fuera de PA y CR mediante `COUNTRY_PRODUCT_NOT_AVAILABLE`. Mantiene validación de RESIDENTIAL y BUSINESS y no toca históricos.
- Estado de pruebas: NO EJECUTADAS en esta intervención; no declarar PROBADO ni OPERATIVO. UI de catálogo por país y selector/OAuth aún pendientes. Sin merge, migración ni despliegue.
- Reutilización: módulo `requestCountry` y `validateRequestDraft` existentes; ningún generador/panel nuevo. Bloqueos productivos previos permanecen.

- EN DESARROLLO, commit 495a667: `core/runtime/commercial-entry.ts` muestra el indicativo telefónico de cada país inicial en la identidad del selector y tolera ausencia del campo `countryCode` al inicializar; reutiliza `COUNTRIES` y sincronización existente. No se afirma persistencia tras OAuth ni publicación. Pruebas NO EJECUTADAS; no merge/deploy.

- EN DESARROLLO, commits 3077722 y 4f5ccdf: `core/runtime/latam-presentation.ts` oculta tarjeta LUGARES fuera de PA/CR al renderizar y cambiar país, incluyendo regla CSS `[hidden]` frente a `display:flex`. La validación del servidor se añadió previamente. Sin pruebas automatizadas ejecutadas ni despliegue; el flujo OAuth y la persistencia entre hosts siguen pendientes.

- ACCESO LATAM EN DESARROLLO (commit c212cb1): panel previo al OAuth desde CTA principal y enlaces de invitado, país seleccionado visible y Google OAuth existente reutilizado. Campos de contraseña y recuperación expresamente deshabilitados/no operativos hasta implementar endpoints, almacenamiento seguro y recuperación; no afirmar registro por correo listo. Sin pruebas ejecutadas, merge ni despliegue.

- [ ] ADMIN ÚNICO: conservar el panel administrativo existente y conectar Direcciones LATAM sin crear otro panel ni duplicar datos.
- [ ] ADMIN LATAM: consultar Panamá y países habilitados desde el mismo panel, con filtros y permisos existentes; comprobar datos reales antes de declarar operativo.
- [ ] DOMINIO ADMIN: habilitar direcciones.lat/admin conservando cuenta.direcciones507.com/admin hasta validar sesión, Google OAuth y redirección segura; no cambiar DNS aún.
- [ ] NATALIE EN ADMIN: reutilizar el chatbot existente en el panel administrativo, verificar CSP, orígenes, permisos y conversación real; no crear otro widget.

- [ ] NATALIE ADMIN, avance de código 2026-10-12: commits 9afad51 y ea0097c reutilizan el widget existente en `core/runtime/server.ts` solamente cuando `nataliePresentationAllowed` autoriza el origen. Pendiente: permitir y probar el origen administrativo real `cuenta.direcciones507.com` o el canónico `direcciones.lat`, comprobar CORS/CSP, conversación real y responsive. Sin pruebas ejecutadas, merge ni despliegue.

- [ ] ACCESO CORREO/GOOGLE, avance 2026-10-12: commit `530ed359` abre el diálogo de ingreso LATAM cuando `/panel` devuelve al visitante con `?access=1`. Rutas de correo y Google existentes; pendiente probar registro, entrega/verificación de correo, login, recuperación, callback Google, sesión y persistencia de país. No afirmar operativo ni desplegado.

- [ ] VENTANAS DE ACCESO estilo Empleos.pa (2026-10-12): commits `0cf07ad`, `e3e29c3` añaden diseño claro, mostrar/ocultar contraseña, enlace «¿Olvidaste tu contraseña?» y botón «Continuar con Google» abajo en el diálogo LATAM existente. Pendiente probar visualmente móvil/tablet/escritorio y flujo real de recuperación, verificación y OAuth; no desplegado.

- [ ] GOOGLE CLOUD OAUTH (acción de propietario): confirmar en el cliente OAuth existente los orígenes autorizados `https://direcciones.lat` y el callback exacto `https://direcciones.lat/auth/google/callback`, además de los de Panamá; verificar que Railway tenga `AD507_GOOGLE_REDIRECT_URI_LATAM`, `AD507_AUTH_SUCCESS_URL_LATAM` y la compuerta de dominio validado. No copiar secretos a checklist ni alterar credenciales sin autorización. Google Sheets no configura OAuth; si se usa, solo registrar resultados.
- [ ] CORREO DE CUENTAS (acción técnica): comprobar variables `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_SECRET`, `EMAIL_FROM` en Railway y entrega de verificación/recuperación. El backend genera enlaces `/verificar-correo` y `/recuperar-contrasena`; verificar que el frontend abra el diálogo con `token`, `email` y acción adecuada desde esas rutas, no solo desde la portada.

- [x] GOOGLE CLOUD OAuth (evidencia visual del propietario, 2026-10-12): cliente web `Direcciones507` muestra orígenes JavaScript `https://direcciones507.com` y `https://direcciones.lat`, y callbacks `https://cuenta.direcciones507.com/auth/google/callback` y `https://direcciones.lat/auth/google/callback`. No crear otro cliente ni duplicar entradas. Esta evidencia acredita configuración visible, no login funcional.
- [ ] GOOGLE OAUTH prueba de extremo a extremo: verificar variables Railway para LATAM, estado del despliegue, callback, cookie, `/v1/auth/me` y llegada a `/panel` mediante cuenta de prueba, sin exponer secretos ni alterar producción sin autorización.

- [x] RAILWAY OAuth inventario (lectura 2026-10-12): servicio `ad507-core` production confirma presencia de `AD507_GOOGLE_CLIENT_ID`, `AD507_GOOGLE_CLIENT_SECRET`, `AD507_GOOGLE_REDIRECT_URI`, `AD507_GOOGLE_REDIRECT_URI_LATAM`, `AD507_AUTH_SUCCESS_URL`, `AD507_AUTH_SUCCESS_URL_LATAM`, `AD507_INTERNATIONAL_DOMAIN_VERIFIED` y `AD507_SESSION_SECRET`. Valores sellados: no se verificó contenido ni estado de la compuerta.
- [ ] RAILWAY CORREO, bloqueo real: `ad507-core` production no presenta `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_SECRET` ni `EMAIL_FROM`; el mailer actual depende de estas variables para registro/recuperación. Elegir proveedor existente y configurar sin exponer secretos, con autorización antes de cualquier despliegue.
- [ ] DESPLIEGUE OAuth/UI: Railway `ad507-core` muestra SUCCESS en `main` commit `c34f7b62` (PR #43), diferente de la rama `feat/unified-country-generation-20261012` que contiene los cambios recientes de ventanas. No afirmar que las ventanas nuevas estén en producción; pendiente validación, integración y despliegue autorizado.

### PR #63 — ejecución de acceso único, 2026-10-14 UTC

- Corregido fallo real de JavaScript: `initializeCommercialNavigation` recibe explícitamente el catálogo serializado, sin depender de imports ausentes en el navegador. Actualizada prueba de conservación de país/campos/fotos.
- Actualizada expectativa de acceso invitado al diálogo compartido. Panamá enlaza al mismo diálogo canónico LATAM con `country=PA&access=1`.
- Excluidos del cierre cambios de validación comercial y widget ADMIN ajenos al acceso; se conserva main para esas partes.
- Correo: errores controlados, rechazo de JSON nulo, creación transaccional de identidad/rol/credencial, reenvío para registro no verificado y consumo de tokens/cambio de contraseña atómicos. Recuperación revoca sesiones previas. Añadidas pruebas con PostgreSQL real en CI y transporte Resend simulado.
- Compilación Bun aprobada; compatibilidad legacy aprobada; 17 pruebas focalizadas aprobadas, 0 fallos. Suite completa local inicialmente bloqueada por PostgreSQL local ausente; no se declara aprobada hasta CI.
- Railway: `RESEND_API_KEY` y `EMAIL_FROM` ya preparados, sin recrear secretos. Todavía pendientes de activar.
- PostgreSQL productivo consultado mediante consola existente: `email_credentials` y `email_auth_tokens` ausentes. Nuevo respaldo lógico del esquema `ad507` guardado en volumen PostgreSQL: `$PGDATA/ad507-release-backups/pr63-pre-email-20261014.dump`. Restauración con `pg_restore --exit-on-error` a base aislada `pr63_restore_20261014`: 41 tablas, 3 usuarios, 0 direcciones, 45 sesiones. Sin reemplazar volumen/reiniciar producción. Este ensayo no acredita recuperación del snapshot histórico del 11 de octubre.
- Reversión: volver al commit previo de aplicación y conservar tablas/datos nuevos; SQL de retirada opcional `schema-proposals/email-auth.rollback.sql` solo permite eliminar tablas vacías y aborta si contienen datos. Migración preparada existente `schema-proposals/email-auth.sql`, sin duplicarla. Pendiente ensayo de aplicar/revertir/reaplicar antes de producción.
- Pendientes de este registro: GitHub Actions, ensayo SQL, activación Resend, integración/despliegue y pruebas reales de ambos sitios.
- CI commit `4ac54a22`: workflow `38506691238`, job compatibility SUCCESS (validación SQL, legacy, compilación, Docker y suite PostgreSQL). Corregido además orden del DOM: diálogo de acceso antes del script que lo inicializa, evitando referencias nulas al abrir. Prueba de regresión añadida; pendiente nuevo CI del ajuste.
- Ensayo SQL sobre restauración aislada: aplicación → reversión con tablas vacías → reaplicación, los tres COMMIT correctos. Sin columnas comerciales ni migraciones de direcciones.

#### Resultado de publicación del PR #63 (2026-10-14 03:36 UTC)

- [x] GitHub Actions final: workflow `38506877045`, job `115666296218`, SUCCESS en `b2efed79f28f41c449aee41e679e6aaa4a2e0c4e`; SQL, legacy, compilación, Docker y suite completa PostgreSQL aprobados.
- [x] PR #63 integrado, commit `6fcebbcda61a49ff423663d1044feee6b0111f03`.
- [x] Tablas de correo aplicadas productivamente con ON_ERROR_STOP, lock_timeout 5s y statement_timeout 15s, después del respaldo/restauración/ensayo de reversión ya registrados. Confirmados ambos nombres mediante `to_regclass`; usuarios=3, direcciones=0 antes de aplicar; no se ejecutaron migraciones de direcciones.
- [x] Resend: dominio `mail.direcciones507.com` verificado, envío habilitado. Variables existentes preservadas; no crear otra clave.
- [ ] Despliegue: preparada fuente exacta `6fcebbcd` + `EMAIL_FROM` y `RESEND_API_KEY` en patch `cb2e3a02-f206-46d0-a85d-45a63d215dd6`, seis campos del mismo servicio, sin cambios destructivos. La llamada `railway_accept_deploy` devolvió «Cancelled — the user did not approve this action. No changes were made.» No se repitió la operación por otro mecanismo.
- [ ] Producción permanece en SUCCESS del commit anterior `c34f7b62`, deployment `b659b587-552b-4e00-a4f7-a76921a815ea`. El acceso nuevo no está publicado todavía. La consulta HEAD anterior a raíz LATAM devolvió 404 por el método. Comprobación GET posterior: ambos dominios responden 200, pero ninguno sirve todavía el diálogo nuevo; Panamá ya muestra el enlace al acceso canónico LATAM. No confundir respuesta 200 con nuevo acceso operativo.
- [ ] Pruebas reales en Panamá/LATAM y entrega/verificación/recuperación/Google: pendientes de aplicar el patch y confirmar SUCCESS en el commit nuevo. No se enviaron correos de prueba ni se crearon cuentas productivas de prueba.
- Continuación concreta: aprobar/aplicar en Railway el patch preparado del servicio `ad507-core`, esperar SUCCESS, comprobar los dos sitios y registrar resultados aquí. No repetir diagnóstico, respaldo ni SQL ya ejecutados. El snapshot histórico 11-oct sigue fuera de este ensayo lógico.

### Reparación urgente pantalla blanca — 2026-10-14

- Reproducida en navegador real `/panel?country=PA` → `/?country=PA&access=1`: body vacío, cero scripts reconocidos y etiqueta style de 98,634 caracteres que contenía `</head><body` y el diálogo.
- Causa exacta: `latam-presentation.ts` sustituía `</style>` por estilos de acceso sin volver a cerrar la etiqueta. Corregido cierre HTML; no se modifica autenticación.
- `server.ts`: nonce aplicado a TODOS los scripts inline reutilizados mediante replaceAll, manteniendo CSP restrictiva existente.
- `user-panel.ts`: iconos apuntan a los archivos públicos existentes en direcciones507.com, sin crear activos ni rutas nuevas.
- Añadidas regresiones con parser HTML real (HTMLRewriter), reconocimiento de body/header/dialog/scripts y nonce de cada script. Pendientes CI, despliegue y verificación visual productiva. Sin tocar SQL, respaldos, códigos, planes, cobros ni direcciones históricas.

#### Cierre verificado de pantalla blanca — 2026-10-14 04:08 UTC

- [x] PR #64 integrado. Commit de aplicación `723f420070a13a68786eb5e5d1826180be5763d3`; corrección `30a05be1871d1a4a9afc8eb87ece6c7ff17d92c5`.
- [x] GitHub Actions `38509509609`, job `115674538035`: SUCCESS; validación SQL existente, legacy, compilación, Docker y suite PostgreSQL aislada aprobados. Pruebas focalizadas locales: 19 aprobadas, 0 fallos.
- [x] Railway `ad507-core`: deployment `2c64998b-45e6-443a-aa25-8c8230def890`, SUCCESS, commit exacto `723f4200`. Ningún servicio, variable, SQL o respaldo nuevo/modificado en esta reparación.
- [x] Navegador real: `/panel?country=PA` llega a `/?country=PA&access=1` y muestra diálogo abierto. Desde portada Panamá, clic Mi cuenta abre el mismo diálogo. Desde raíz LATAM, clic Ingresar abre el diálogo. Body ahora tiene 7 hijos; sin pantalla blanca.
- [x] Botones reales: Crear cuenta con correo, Ya tengo una cuenta → Ingresar con correo y Olvidaste tu contraseña → Enviar recuperación funcionan visualmente. Google abre selector de cuentas en accounts.google.com con callback LATAM correcto. No se seleccionó identidad ni se introdujeron credenciales; no se afirma una sesión autenticada nueva.
- [x] Respuesta HTTP LATAM 200, cierre style antes de head y todos los scripts emitidos con nonce coincidente con CSP. Sin errores de JavaScript/CSP propios del sitio observados; mensajes de extensión del navegador excluidos. Ambos iconos públicos existentes de Panamá: 200 image/png.
- [x] Checklist actualizado. Pantalla blanca y acceso visual cerrados; no quedan bloqueos de esta reparación.

### Corrección visual integral de acceso y Mi cuenta — 2026-10-14

- Referencia consultada: `direcciones507/Empleos-pa`, `apps/web/components/LoginForm.tsx` main, blob `cea5765e3421f324a41d4d3bcc7b7df0ecc0f2dc`. Solo proporciones y distribución; no lógica importada.
- `latam-presentation.ts`: CSS del diálogo consolidado, menos altura/espacios, cierre arriba, botones proporcionados, Google en el mismo contenedor. Límite por 100dvh y scroll interno para pantallas bajas. Sin cambiar handlers, validaciones, país ni OAuth.
- `user-panel.ts`: paginación centrada con separación inferior; tipos de solicitud uniformes/centrados; acciones Revisar/Cerrar y Próximamente al ancho de contenido. Reutiliza panel existente. Presentación por host cambia únicamente textos visibles en LATAM, conserva Panamá, URLs, códigos y lógica interna; regresión compara scripts normalizando solo las tres frases de marca cambiadas.
- Regresión en `tests/account-presentation.test.ts`: marca por dominio y ruta real de panel con CSP/nonce preservado. Pruebas de pantalla blanca, parser HTML y scripts siguen aprobadas.
- Chromium real aislado con respuestas API simuladas, sin datos productivos: 390×844, 320×480, 768×600, 1024×768, 1440×900. En los cinco: diálogo único, Google accesible dentro del diálogo, Cerrar, Mostrar/Ocultar, cambios de modo, recuperación simulada, conservación Costa Rica/+506, paginación, revisión y cierre del formulario aprobados; envío continúa deshabilitado. Cero errores JS y cero desbordamientos de panel.
- Medidas: diálogo de 479–513px en tamaños normales; en 320×480 limitado a 456px con scroll interno. Botón cargar más separado 28px (móvil) / 34px (tablet/escritorio) del borde inferior. Tres tipos uniformes y en fila desde tablet. Capturas inspeccionadas de teléfono, tablet y escritorio; fixtures de panel autenticado aislado, no se afirma sesión productiva nueva.
- Compilación Bun y check legacy aprobados. Pendientes CI de integración, despliegue y comprobación de acceso público productivo. Sin SQL, Apps Script, Excel, R2, planes, precios ni pasarelas.

#### Cierre visual integral verificado — 2026-10-14 04:31 UTC

- [x] PR #65 integrado: commit aplicación `2525844988f7dd909cb7bc3852d3f18dc3a53cdd`, corrección `7cb89adbb541a9511714155198b44dc58819b7d5`.
- [x] GitHub Actions `38511473440`, job `115680736947`, SUCCESS: legacy, compilación, Docker y suite completa aislada PostgreSQL. Focalizadas: 28 aprobadas, 0 fallos.
- [x] Railway deployment `0b666b9e-ec01-4de2-a5bf-7b320e293a34`: SUCCESS con commit exacto `25258449`; únicamente fuente del servicio existente actualizada, sin variables ni recursos nuevos.
- [x] Navegador público productivo: ventana única abierta con Costa Rica y +506 conservados; 440px ancho y 498.375px alto en la vista observada. Google dentro del contenedor y visible, sin desbordamiento horizontal ni pantalla blanca. Mostrar/Ocultar cambia tipo de campo; modo Ingresar y recuperación muestran sus controles correctos; Cerrar y reapertura funcionan. Google llega al selector real de cuentas; no se eligió identidad ni introdujeron credenciales.
- [x] Confirmación visual responsive anterior al merge: cinco tamaños Chromium reales, capturas inspeccionadas, panel autenticado con respuestas API de prueba aisladas (no sesión productiva). Paginación, formulario, marcas y botones aprobados. Se conserva deshabilitado Enviar solicitud · Próximamente; no se realizaron envíos ni pagos.
- [x] Checklist final actualizado. Sin bloqueos técnicos pendientes de esta intervención visual.

### Fichas públicas: rediseño visual inferior responsive — 2026-10-14

- Solo plantilla compartida `ad507.template.html`: presentación inferior reorganizada en izquierda (acciones, redes disponibles, navegación 2×2) y derecha (un contenedor carbón de horario/referencia/código postal opcional/QR/estadísticas). En móvil se apila en ese orden; estilos nuevos limitados a `.public-lower-layout`.
- Se movieron los nodos originales, conservando IDs, atributos, condiciones y eventos. No se añadió JavaScript ni se cambió API, endpoint, navegación, teléfono, QR, estadísticas, OWNER, privacidad ni permisos. Teléfono fijo opcional conservado, sin desplazar las tres acciones principales.
- Redes: título fuera del nodo cuyos hijos evalúa el script existente, por lo que su cálculo de visibilidad no cambia; wrapper oculto por CSS cuando redes-container está hidden. Ninguna red nueva sin configurar.
- Regresión automatizada: hash de todos los scripts idéntico al baseline, identidad superior y galería idénticas byte por byte; controles originales únicos y condiciones hidden/display conservadas. 2 pruebas / 26 aserciones aprobadas.
- Chromium aislado, usando lecturas reales de datos públicos sin modificarlos: THE1920 Premium Pro, FJSPORTGYM Premium, LABDIESELMONTERO Negocio; tamaños 390×844, 320×568, 768×1024 y 1440×900. Doce combinaciones aprobadas: enlaces/targets/visibilidad y QR idénticos antes/después, dimensiones de identidad/galería/descripción iguales, dos columnas equilibradas desde tablet, una en móvil, tres acciones uniformes, desplegables/QR y lectura de estadísticas simulada funcionando, sin desbordamientos ni errores JS. Imágenes aisladas sustituidas por fixtures solo durante las mediciones.
- Caso adicional sin redes configuradas en fixture local: wrapper y título ausentes sin modificar el script. Capturas de teléfono/tablet/escritorio inspeccionadas. Ningún clic ni dato estadístico real escrito por las pruebas.
- Pendiente: CI completo, integración/publicación mediante generador Pages existente y verificación productiva. Railway permanece sin cambios por restricción expresa.


## 2026-10-14 · Portada LATAM responsive y textos (solo presentación)

- Base main 5dc8f539 (PR #66 preservado). Cambios limitados a latam-presentation.ts y prueba de portada; sin cambios en panel, fichas, datos, proveedores ni infraestructura.
- Portada horizontal desde tablet: texto/CTA y mapa existente en columnas; países separados con cuatro tarjetas por fila y selección destacada. Móvil: título, descripción, mapa, CTA, países, beneficios, planes, disponibilidad y ayuda.
- Beneficios uniformes; planes centrados con dimensiones comunes y ajuste de texto; disponibilidad en franja y footer con marca/enlaces en dos grupos compactos. Mismos colores, logo, bytes de mapa, países e indicativos.
- Textos: “enlace”, descripción de navegación sin promesa absoluta, Premium con código postal/zona postal y nombre completo del plan base; Premium Pro mantiene descripción comercial y hasta cinco fotos, contrastado con index.html y capacidades existentes. Sin nuevos beneficios/precios/condiciones. Tarjeta Panamá identifica Direcciones507 sin duplicar “Panamá”.
- 24 pruebas aprobadas / 183 aserciones en acceso, portada, contexto comercial y panel. Scripts generados y ventana de acceso idénticos byte por byte respecto a la base.
- Chromium aislado: 320×568, 390×844, 768×1024, 1024×768 y 1440×900; sin desbordamientos, hero horizontal/vertical correcto, footer compacto, apertura/cierre del acceso, país CO conservado, ocho banderas y aviso legal funcionando. Sin llamadas productivas ni envíos.
- CI e integración se registran en el PR de esta única intervención al completarse. No se opera Railway por restricción expresa.

## 2026-10-14 · Restauración móvil de fichas individuales

- Referencia histórica: 4568281e, inmediatamente anterior al rediseño PR #66. Base de trabajo: main 1d7ab58d; portada LATAM del PR #61 y página principal de Panamá intactas.
- La plantilla ad507.template.html conserva todas las reglas históricas y limita el bloque visual de PR #66 a min-width:768px. No se inventan valores de color, dimensiones ni separaciones móviles.
- Se reutilizan los mismos nodos: navegación antes del contenedor inferior; luego galería, acciones, redes, QR/estadísticas, horario, postal y referencia en el orden histórico. Un adaptador exclusivamente de presentación cambia su ubicación al cruzar 767/768px y la restaura a sus posiciones actuales en pantallas anchas; no clona ni modifica enlaces, datos, hidden, permisos o eventos.
- Los scripts funcionales anteriores conservan exactamente su SHA-256 49da00046e9d33aa619da670a6abe8122d31e767e4ba2f375539890a7238b66f. Identidad y galería conservan sus hashes. El adaptador se comprueba separadamente.
- 4 pruebas de plantilla aprobadas, 38 aserciones: scripts parseables, controles únicos, hidden/configuración y teléfonos conservados. Sin cambios en runtime residencial/OWNER, PIN, QR privado, sesiones ni generadores/filtrado residencial.
- Comparación Chromium con datos simulados, sin llamadas productivas: posición/tamaño, margen/padding/gap, colores/fondos/bordes, fuentes y colores/tamaños de iconos, enlaces y hidden contrastados contra la referencia histórica en móvil y contra main actual en tablet/escritorio. Resultados finales de navegador y CI registrados en el PR de esta única corrección.

## 2026-10-14 · Fichas: íconos y alineación tablet/escritorio

- Base PR #67 / d84a6524. Solo plantilla individual, prueba de plantilla, licencia de íconos y este checklist; páginas principales y scripts funcionales sin cambios.
- Colores históricos recuperados para Ver mapa (#b45309), Llamar (#15803d), Compartir (#7c3aed) e íconos informativos; navegación conserva sus colores y Uber tiene tarjeta negra con borde visible. Instagram compacto, sin expandirse para ocupar la fila; mismas condiciones de redes configuradas.
- Se incrustan los mismos trazados oficiales Font Awesome Free 6.0.0-beta3 en SVG, con licencia/atribución, exclusivamente para los íconos inferiores desde 768px. Esto evita depender de la fuente externa para los íconos de tablet/escritorio. En móvil los SVG permanecen ocultos y la presentación aprobada conserva sus reglas y glifos.
- Navegación de 60px y separación de columnas ajustada; el espacio flexible queda entre secciones, sin estirar botones. Borde inferior de WhatsApp y contenedor de información con diferencia medida de 0px a 768, 1024 y 1440px.
- 5 pruebas de plantilla aprobadas / 77 aserciones. Hashes de scripts funcionales, identidad y galería conservados. Referencias SVG locales verificadas.
- Chromium con datos públicos leídos de THE1920, imágenes aisladas y estadísticas simuladas: 390, 768, 1024 y 1440px aprobados, sin desbordamientos/errores JS. A 390px se compararon antes/después posiciones, tamaños, estilos, fuentes, colores, enlaces y hidden sin diferencias. En anchos >=768px se bloqueó el CSS/fuentes del CDN: todos los SVG visibles tienen trazados y dimensiones reales; se comprobaron colores, Uber, Instagram y alineación. QR, horario, referencia y estadísticas simuladas operativos; enlaces y condiciones de visibilidad idénticos a la base.
- Publicación y CI finales se registran en el PR de esta corrección; solo se publica después de las verificaciones aprobadas. No se opera Railway ni se modifican datos productivos.

## 2026-10-15 · Pendiente aprobado: detalle completo de planes en Direcciones LATAM

- Estado: **PENDIENTE DE IMPLEMENTACIÓN**. Requisito solicitado por propietario; no confundir registro con función terminada.
- En direcciones.lat, cada tarjeta de plan (Residencial, Negocio Gratis, Premium y Premium Pro) debe permitir abrir un contenedor/modal de **información completa del plan** al tocar «Preparar dirección», antes de continuar al formulario. Incluir acción clara para continuar o cerrar y conservar selección de país y plan.
- Mostrar precio y moneda, periodicidad, promociones y vigencia, renovación, características y límites reales, código digital/QR, navegación, contactos, fotografías, y opciones de actualización según el plan. No inventar prestaciones ni prometer pagos no habilitados.
- Usar una única fuente de configuración de planes, sin duplicar lógica multinacional; diseño adaptable a móvil/tablet/escritorio y accesible por teclado. Validar que los cuatro detalles y el retorno al formulario funcionan físicamente.
- Respetar decisiones comerciales vigentes: Negocio Gratis sin descripción breve; Premium sin reporte mensual/analytics; Premium Pro con hasta cinco fotos; promociones de fundadores hasta 9-nov-2026 y etapas posteriores según reglas comerciales. Verificar los textos contra la configuración vigente antes de publicar.
- No modificar el flujo histórico Apps Script/Excel, los 40 códigos históricos, las migraciones productivas ni la pasarela de pagos. Registrar commit, CI, despliegue y prueba física antes de declarar OPERATIVO.

## 2026-10-15 · Control de calidad y contacto obligatorio para Lugares

- **Estado: PENDIENTE DE IMPLEMENTACIÓN Y PRUEBA.** Solicitud expresa del propietario: impedir que cualquier persona publique información falsa, ofensiva o arbitraria en Lugares; ADMIN debe poder contactar al solicitante por correo.
- Hallazgo en código: `request-validation.ts` admite `email` vacío (`field('email',160,false)`), aunque valida formato cuando se proporciona. El detalle ADMIN muestra `r.extras.email` o «No indicado». La revisión manual `PENDING_REVIEW`/`APPROVED` ya existe; conservarla y verificar que ninguna ruta de publicación permita saltarla.
- Exigir correo válido para nuevas solicitudes de tipo `PLACE`, tanto en formulario como en validación de servidor. Preservar compatibilidad con solicitudes históricas sin correo y no inventar direcciones de contacto. Determinar si el correo autenticado verificado puede reutilizarse con consentimiento visible.
- ADMIN: presentar correo y solicitante claramente, revisión de nombre, descripción, ubicación, fotografías y contenido antes de aprobar/publicar; permitir rechazo con motivo y comunicación manual por correo. No prometer envío automático sin servicio de correo configurado.
- Añadir pruebas de correo ausente/inválido, permisos de revisión y prohibición de publicación automática; comprobar en tablet y móvil. No tocar códigos históricos, pagos ni otras clases de dirección.

## 2026-10-15 · Seguimiento de correcciones visuales, retorno LATAM y códigos cortos

- **Correcciones visuales: EN DESARROLLO, no OPERATIVO.** Finalizar botones y tarjetas del panel cliente y ADMIN: tamaño, alineación, contraste, tipografía, estados, apertura de detalle y adaptación móvil/tablet/escritorio. Revisar en producción en ambos dominios antes de cerrar.
- **Cerrar sesión LATAM: CÓDIGO CORREGIDO, PRUEBA PRODUCTIVA PENDIENTE.** `core/runtime/user-panel.ts` ya redirige a `https://direcciones.lat/` si el host es `direcciones.lat`, y a `https://direcciones507.com/` en caso contrario (commit `30b6e68`). Probar desde la entrada LATAM y verificar el host real del panel compartido y el retorno tras OAuth; si el panel se aloja en otro host, preservar el portal de origen de forma segura y sin redirección abierta.
- **Nuevos códigos automáticos: PENDIENTE DE DISEÑO/IMPLEMENTACIÓN.** Solicitud actual del propietario: prefijo de país existente más máximo ocho **dígitos numéricos** si no se solicita nombre personalizado. Nombre personalizado opcional, único y validado. Contrastar con la regla anterior de máximo ocho caracteres alfanuméricos; prevalece esta precisión del propietario para generación automática, sin tocar los 40 códigos históricos ni renombrar URLs/QR existentes. Verificar colisiones, concurrencia, reservas y unicidad antes de activar generación.
- No declarar completado por CI verde ni por commit aislado. Registrar evidencia de pruebas físicas, despliegue y ausencia de regresiones.

## 2026-10-15 · Descripción breve por tipo de plan (decisión del propietario)

- **PENDIENTE DE IMPLEMENTACIÓN Y PRUEBA.** Mostrar y permitir el campo «Descripción breve» **únicamente** para solicitudes de **Lugar** y **Negocio Premium Pro**.
- **Ocultar y no exigir** «Descripción breve» en **Negocio Gratis** y **Negocio Premium**. No mostrarlo tampoco en Residencial salvo decisión posterior expresa.
- Aplicar la regla tanto en el formulario cliente (cambio dinámico de tipo/plan y al volver a editar) como en validación y persistencia del servidor; impedir que un valor oculto de otro plan se envíe accidentalmente. No alterar descripciones históricas.
- Confirmar nombres/identificadores reales de planes antes de modificar código; mantener independiente el campo «Referencia» y cualquier descripción extensa que tenga finalidad diferente.
- Probar cambios Gratis → Premium → Premium Pro → Lugar y viceversa en móvil/tablet, guardado, revisión ADMIN y ficha pública. CI verde no sustituye prueba productiva.


## Cierre visual completo solicitado 16-oct-2026 — implementación

Base real: main `3a69b9f19f883c4550895511df9a388455b92942`. Reutiliza la rama existente de PR #62 (fusionado) y seguimiento #82. El propietario confirma OAuth, +506, generación, copiar/abrir y portada+3 fotografías: no se reconstruyeron.

- [x] Botones compartidos: altura táctil mínima 44 px, radio 12 px, tipografía, ajuste de texto, separación, foco, disabled/loading visual.
- [x] Mi cuenta: nombre/acciones superiores conservados, estado a la derecha, tarjetas y nueva solicitud compactadas; contenedor de formulario aplanado.
- [x] Detalle: eliminación de segundo Abrir dirección digital debajo de fotos; se conserva el botón superior de la tarjeta, fotografías privadas y Google Maps válido.
- [x] ADMIN: tarjetas de navegación, listas, detalles, acciones y ajuste de columnas para teléfono/tablet; estados comprensibles en español sin cambiar valores ni permisos.
- [x] Portadas: CTA de Panamá y estilos compartidos LATAM/planes/acceso corregidos sin alterar contenido comercial. Copyright centrado conservado.
- [x] Reglas responsive móvil (<768), tablet (768–1099), escritorio; revisión de sintaxis/diff y pruebas locales: 133 PASS, 1 escala SKIP, 0 FAIL; build Core y check-legacy PASS.
- [x] CI completo: run 38854888828 SUCCESS, 182 PASS / 0 FAIL / 2787 verificaciones. Build Docker, validaciones y pruebas PostgreSQL reales aprobados. Commits 984948c (estilos/duplicado), 36daf7f (prioridad CSS por hostname), d229996 (visibilidad hidden y 44px ADMIN).
- [x] Despliegue funcional final: Railway 89da06fb-0ec1-420e-bcf7-4ed95c062a71 SUCCESS, main d229996. Health público ok:true. ADMIN anónimo: Mi panel/Continuar con Google 44px, radio 12px, logout oculto, sin overflow a 1363px. Ficha pública nueva abre y conserva imagen/código sin overflow.
- [ ] Aceptación visual física móvil/tablet/escritorio autenticados: pendiente. Cloud Browser actual está en acceso sin sesión; no se alteró autenticación ni se simularon datos. Las reglas y pruebas no equivalen a validación física.

Archivos: index.html (solo CSS CTA), shared-visual-style.ts, user-panel.ts, latam-presentation.ts, server.ts, request-client-ui.ts, request-admin-ui.ts y pruebas visuales/de detalle. Sin cambios en Excel, Apps Script, históricos, generación, medios/R2, pagos, auth, permisos, esquema ni migraciones. Filtros territoriales, edición/códigos y pagos siguen fuera de esta etapa.

Verificación pública real de la primera publicación 984948c: Railway a9290552-71e0-469e-a1df-24ae28044591 SUCCESS; LATAM estilos presentes, copyright centrado y sin overflow a 1363 px. Portada Panamá: cuatro CTA de planes con altura real 44px y radio 12px; sin overflow. Planes LATAM revisados visualmente. ADMIN anónimo requiere Google: no se falseó acceso ni se modificaron roles. La corrección posterior conserva explícitamente .hidden/[hidden] frente a reglas de botones.

Estado real del cierre: implementación y despliegue probados; aceptación física autenticada pendiente. No marcar móvil/tablet como comprobados en dispositivo: se revisaron reglas responsive y contratos automáticos. El navegador disponible no expone ajuste de viewport y permanece sin sesión. El propietario debe revisar Mi cuenta, Nueva solicitud y detalle/fotos, y las seis secciones ADMIN en su tablet/móvil; no es necesario repetir generación ni carga de R2 acreditadas.
