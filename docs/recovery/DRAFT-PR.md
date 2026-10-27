# fix(core): recuperar nombres Premium y alias públicos Pro sin cambios visuales

Las solicitudes con nombre terminaban en códigos numéricos desde la retirada de la lógica anterior. Esta propuesta recupera selectivamente Premium con prefijo y añade alias Pro sin prefijo, conservando el identificador interno N8, publicación desde Core/PostgreSQL, pagos, propiedad y estadísticas.

Reserva transaccional previa al pago, exclusión global Pro, nombres equivalentes/históricos/sistema protegidos y disponibilidad autenticada. Los reintentos no cambian la identidad emitida. El publicador reutiliza su sesión para evitar la espera circular del pool de dos conexiones. El flag nuevo está apagado por defecto; SQL solo como propuesta manual. Precios intactos; vigencia anual nueva y cálculo de renovación voluntaria, sin cobros automáticos ni cambios retroactivos.

No cambia CSS, diseño, imágenes ni distribución. El JavaScript existente usa el nombre y URL canónica en copiar/compartir/QR; la analítica conserva el código interno. Preparación por hashes de Jacinto/Liliana e inventario de otras rutas, sin tocar gh-pages.

Validación local: 289 pruebas aprobadas, tres omitidas; SQL PostgreSQL WASM descartable con IPN/R2 simulados, responsive 390/820/1440, build y legado correctos. Tres pruebas de la suite amplia bloqueadas por falta de PostgreSQL nativo. Benchmark sintético p95 1.266→1.257 ms; dos publicaciones dejan de esperar otra conexión, sin aumentar max=2. No son mediciones productivas.

**Borrador: no integrar ni desplegar.** Pendientes PostgreSQL nativo/concurrencia real, reconciliación completa de históricos/QR y edge del dominio, revisión de la propuesta SQL, límite de reservas y política de vigencia/renovación. No ejecutar Actions, migraciones, pagos reales ni despliegues. Ver [informe completo](https://github.com/direcciones507/direcciones507/blob/fix/custom-codes-safe-20261026/docs/recovery/SAFE-CUSTOM-CODES.md).
