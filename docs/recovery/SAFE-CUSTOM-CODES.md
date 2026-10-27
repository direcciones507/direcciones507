# Recuperación segura de códigos personalizados — revisión técnica

Estado: propuesta de desarrollo, NO autorizada para integración, migración ni despliegue.
Base: `2e9ee6a4b03a03e3d54a8a78af6b7863427d3374`.
Rama: `fix/custom-codes-safe-20261026`.
Fecha de revisión: 26 de octubre de 2026 (Panamá).

## Resultado preparado

- Premium: nombre solicitado normalizado con prefijo nacional; ejemplo `AD507-CAFEDELPRADO`.
- Premium Pro: nombre público exclusivo `CAFEMALAGA`, URL `https://direcciones.lat/CAFEMALAGA`, manteniendo un identificador interno `AD507-N########`.
- El asignador N8 vigente permanece para los demás casos. No se recuperan Excel, Apps Script, páginas individuales ni el bloqueo `productNamespaceExclusive` de la lógica retirada.
- La opción nueva `AD507_CUSTOM_NAMES_ENABLED` queda apagada por defecto. Las compras de nombres fallan de forma explícita mientras no esté preparada la reserva; no se convierten silenciosamente en códigos numéricos. Los alias ya publicados se siguen leyendo aunque se apague la escritura.
- La tabla nueva se entrega exclusivamente como propuesta SQL manual. No existe DDL nuevo de arranque ni conexión a una base productiva en estas pruebas.

## Evidencia histórica

| Referencia | Hallazgo |
|---|---|
| [be4e02b](https://github.com/direcciones507/direcciones507/commit/be4e02b57306da7f8c3de895a346ebb6040abf1c) | Introdujo normalización y asignación con nombre, aún con prefijo. El nuevo bloqueo de namespace impidió publicar sin su variable. No demuestra una emisión personalizada exitosa en producción. |
| [026d31a](https://github.com/direcciones507/direcciones507/commit/026d31ab98b64200c2fee572d3bebca92c88ddeb) | Retiró esa ruta y restauró el asignador numérico. Solo se reutiliza la idea de normalización, sin restaurar el bloqueo. |
| [PR #93](https://github.com/direcciones507/direcciones507/pull/93) | Asignador rápido N8 derivado del UUID; se conserva su fórmula. |
| [d5e342e](https://github.com/direcciones507/direcciones507/commit/d5e342e3763cda2592e887216e8d8072a85e8ca3) | Documentó el nombre público Pro sin prefijo como pendiente. |
| [PR #106](https://github.com/direcciones507/direcciones507/pull/106) | Estadísticas existentes, cuya presentación y reglas no se cambian. |
| [rama de vigencia](https://github.com/direcciones507/direcciones507/tree/feat/plan-expiry-renewal-20261017) | Revisado `7c48da06ffbc19a38d3c0bb9618d7fafd55b2b4d`; no está integrado en main. No se importa su scheduler, correo ni interfaz de renovación. |

## Reserva y seguridad

La normalización elimina acentos combinantes, espacios y puntuación admitida; exige letras y hasta 60 caracteres alfanuméricos. Rechaza HTML, separadores de ruta y alfabetos no admitidos. Nunca trunca ni cambia automáticamente un nombre en conflicto. Las rutas del sistema, nombres históricos y namespace numérico están protegidos.

La reserva se crea en la misma transacción que la solicitud y su propiedad, antes de preparar el pago. Un bloqueo transaccional por nombre normalizado serializa Premium/Pro y países; claves únicas protegen nombre y dirección. Pro verifica también los nombres prefijados de todos los países configurados. Los códigos existentes en SQL se comparan normalizados, incluso con separadores. No se habilitan planes pagados en países que actualmente los tienen cerrados.

La reserva permanece vinculada a la dirección y su propietario vigente; no se libera por archivo, vencimiento o transferencia. Se propone un máximo de tres reservas no publicadas por propietario para limitar acaparamiento; esta política necesita revisión del propietario antes de habilitar. El control es aplicativo y debe endurecerse con una prueba nativa de altas simultáneas del mismo propietario si se mantiene ese límite. No existe venta, reasignación ni liberación automática de nombres.

La disponibilidad requiere sesión y rol, tiene límites de consultas y no expone propietarios. Permite reintentar una solicitud propia pendiente; el servidor conserva las comprobaciones de idempotencia y no concede un segundo propietario. La consulta no sustituye la reserva transaccional.

Pago confirmado y aprobación siguen siendo obligatorios en la publicación manual probada. Se conserva la política existente de activación automática; su circuito completo productivo no se activa ni se declara validado por esta corrección. Los alias pendientes no son públicos; archivados responden 410. Estadísticas privadas siguen comprobando propiedad mediante el identificador interno.

## Conservación visual

No hay modificaciones de CSS, imágenes, fuentes ni distribución. `index.html`, `ad507.template.html`, presentación LATAM, estilos compartidos, resumen de estadísticas y ADMIN son idénticos byte por byte a la base; también `/jacinto/` y `/liliana/`.

Los componentes tocados son necesarios para la función: JavaScript del formulario consulta disponibilidad en los elementos existentes; la tarjeta copia/muestra el nombre público; el render público usa ese nombre y la URL canónica para compartir y QR. Clases, estructura y estilos permanecen. El identificador de analítica y medios sigue siendo el interno.

Se compararon en navegador fixtures offline de Premium, Pro, panel con dos tarjetas y formulario Pro, a 390/820/1440 px, antes y después: sin desbordamiento horizontal; mismos estilos. El fixture simula fetch y UUID solo para HTTP local. No equivale a dispositivos físicos, comparación píxel a píxel ni autenticación/pagos reales. Ver `evidence/responsive.json` y `evidence/appearance.json`.

## Históricos: preparación, no publicación

[2508d54](https://github.com/direcciones507/direcciones507/commit/2508d5456782be788511118e6c249517dd4f4307) retiró rutas de gh-pages. Los archivos de Jacinto y Liliana siguen en main y coinciden con la versión publicada previa [e3b3095](https://github.com/direcciones507/direcciones507/commit/e3b3095aed3163b0bdb56ec22a417a81455ad8c0).

`scripts/prepare-historical-recovery.ts` prepara copias exactas fuera del repositorio y un manifiesto, sin escribir gh-pages. Sus SHA-256:

- Jacinto: `c5e2b896ebce5c932f7a8674af9fe5e3e1db663fb546083569c4eaea1e9e7eed` (21 666 bytes).
- Liliana: `6e74556dc78bcba79963b44a1162e74ab6c6efb1e5e0b8df6de70e234b6a4ae1` (5 819 bytes).

El manifiesto inventaría otras **2004 rutas excluidas**, sin restaurarlas a ciegas ni inventar destinos. El registro preventivo contiene 2003 nombres raíz únicos sin distinguir mayúsculas, tomado de e3b3095. No es prueba de exhaustividad sobre todos los registros históricos externos o posteriores.

Antes de habilitar nombres debe reconciliarse ese inventario con el registro histórico autoritativo y los códigos SQL actuales, protegiendo también equivalencias. Deben verificarse HTTP, destino, activos y QR históricos en un entorno aprobado. Los HTML originales contienen dependencias antiguas (`/logo.png`, imágenes externas de ejemplo); se conservan sin sustituirlas. Esta rama no recupera por sí sola enlaces actualmente caídos en producción.

## Precios, vigencia y renovación

No se cambian `payment-policy.ts`, importes Yappy ni pedidos existentes: Residencial 1299, Premium 1999 y Pro 3999 centavos USD.

Para solicitudes nuevas con la función habilitada se prepara una instantánea anual P1Y con aceptación, importe y moneda. El período comienza al publicar tras pago confirmado y dura un año calendario; 29/febrero se ajusta al 28/febrero siguiente. Un IPN repetido o una publicación repetida no reinicia el plazo. No se aplican fechas retrospectivas a direcciones ya emitidas.

La renovación voluntaria se entrega como cálculo puro con consentimiento y pago nuevo verificado; no hay endpoint nuevo de cobro, cobros automáticos ni worker de vencimiento. Pendientes: aprobar política de inicio exacta, conciliar la rama de vigencia, circuito completo de renovación y comportamiento al vencer. No se cambia el texto comercial ni la interfaz bajo esta autorización sin cambios visuales.

## Pruebas realizadas

| Comprobación | Resultado y alcance |
|---|---|
| Suite sin dependencias nativas | 289 aprobadas, 3 omitidas, 0 fallidas; 2065 aserciones en 69 archivos. |
| Ejecución amplia | 289 aprobadas; tres casos bloqueados por ausencia de PostgreSQL local/permiso para usuario del servidor embebido. No se ocultan como aprobados. |
| Nuevas pruebas unitarias | 10 aprobadas; normalización, rutas reservadas, Premium/Pro, autorización, fallo cerrado, QR, código interno, precios y período anual. |
| Integración PostgreSQL WASM descartable | Solicitud, reserva antes de pago, duplicado, reintento propio, IPN sintético firmado, aprobación, publicación Premium/Pro, URL/QR, visitas y clics, filtros Pro 7/30/90, privacidad, transferencia y archivo. |
| Doble reserva | Una ganadora/una rechazada en SQL WASM; sigue pendiente concurrencia real de conexiones y procesos nativos. |
| Compilación y legado | Bun build correcto; `check-legacy` y comparación de estilos correctos. |
| Históricos | Preparación exacta por hash; no se publicó ni se probó todo el inventario en producción. |

No se usaron credenciales productivas ni el servicio `shadow`. R2 y proveedor de pago son simulados; solicitudes HTTP externas del runner: cero. No hubo pagos reales, acciones de CI, despliegues ni migraciones productivas iniciadas por las pruebas.

## Rendimiento y conexiones

Se conserva `max: 2`. La reserva/publicación canónica reutiliza la sesión ya reservada: evita que dos publicaciones ocupen ambas conexiones y esperen una tercera. No se aumenta el pool.

Comparación de la ruta numérica en el mismo arnés local sintético, 100 muestras tras calentamiento:

| Métrica | Base | Propuesta |
|---|---:|---:|
| p50 | 1.160 ms | 1.136 ms |
| p95 | 1.266 ms | 1.257 ms |
| Dos publicaciones / dos conexiones | 1 completada, 1 timeout artificial | 2 completadas, 0 timeout |

El timeout de 250 ms es impuesto por el arnés, no un parámetro productivo. Estas cifras no miden latencia real de Core/PostgreSQL, red, medios ni Yappy y no prueban mejora productiva. Deben repetirse en PostgreSQL nativo aislado, incluyendo nombres, colisiones, pagos y saturación, antes de aceptar el cambio.

## Condiciones pendientes antes de integración

1. PostgreSQL nativo descartable: ejecutar prueba nueva y suites existentes de arranque sin DDL, HTTPS, integración y escala; comprobar dos publicaciones simultáneas y reservas entre procesos.
2. Reconciliar todos los nombres/códigos históricos y rutas; aprobar las recuperaciones exactas de Pages y sus activos, sin reutilizar nombres antiguos.
3. Probar dominio/edge para las rutas raíz Pro, variantes de mayúsculas y slash, QR y links impresos; no modificar DNS ni Pages con este PR.
4. Revisar y asignar número de migración a `public-names.sql`, comprobar plan de consulta, locks, respaldo y permisos, y solo ejecutarla con autorización expresa. La propuesta aborta si ya existe la tabla para exigir revisión del ledger.
5. Revisar límite de reservas, política anual y conexión futura con la rama de renovación, sin activar cobros automáticos.
6. Repetir compatibilidad y rendimiento con backend real aislado y proveedores de prueba. No hay validación completa de producción ni garantía de todos los históricos.
7. Antes de abrir el PR, verificar que Railway PR Environments está desactivado: crear un PR puede crear infraestructura. La herramienta conectada solo muestra fuente main; el navegador no tiene sesión y devuelve login/404. `[skip ci]` protege workflows push/pull_request revisados, pero no garantiza bloquear Railway.
8. Aprobar expresamente cualquier integración, migración o despliegue posterior. El borrador no es autorización de publicación.

## Reproducir localmente sin CI

Con Bun 1.4.0 y dependencias existentes de `core/runtime`:

```sh
bun test core/runtime/tests/custom-names.test.ts
bun core/runtime/scripts/check-custom-name-appearance.ts
bun core/runtime/scripts/check-legacy.ts
bun build core/runtime/server.ts --target=bun --outfile=/tmp/core-review.js
```

La prueba nativa solo acepta `AD507_TEST_DATABASE_URL` en localhost y crea/elimina una base con nombre único. No usar una URL reenviada de producción. El runner WASM requiere `AD507_PGLITE_PACKAGE` apuntando a una instalación local explícita de PGlite; no añade dependencias al runtime. El benchmark requiere `AD507_BASELINE_ROOT` apuntando al checkout base; la preparación visual también requiere directorio de salida externo. La recuperación histórica requiere la historia git e3b3095/1ed0dd8 disponible y salida externa explícita.

Los resultados condensados están en `evidence/`; el inventario de históricos está en `historical-route-audit.json`.
