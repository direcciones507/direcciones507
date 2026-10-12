# Direcciones507 | Migración progresiva hacia el panel nuevo

Estado: diseño operativo. **No habilita funciones ni cambia producción.**

## Regla de convivencia
- Hasta que el nuevo flujo sea aprobado en prueba física, todo cliente nuevo se crea con el Excel Máster y Apps Script actuales.
- Tras aprobar el nuevo flujo, cada cliente nuevo se crea exclusivamente en el panel nuevo.
- Las direcciones existentes continúan sirviéndose por el mecanismo legado hasta que **cada una** haya sido migrada y aprobada individualmente.
- No crear códigos AD507 adicionales para direcciones migradas. Mantener código, URL, QR, titularidad y accesos.
- No desactivar Excel, Apps Script ni rutas legadas mientras quede una sola dirección que dependa de ellos.

## Flujo nuevo, inicialmente aislado
1. Administrador autenticado inicia ficha en borrador (sin publicar), selecciona plan y registra datos.
2. Validación por plan: LUGAR = 1 foto; NEGOCIO GRATIS = 1 logo; PREMIUM = 1 logo; PREMIUM PRO = 1 logo + hasta 5 fotos.
3. Backend autorizado recibe archivos, comprueba tipo/tamaño y titularidad, optimiza copias públicas y almacena en Cloudflare R2 mediante credenciales **solo del servidor**. No exponer claves R2 al navegador.
4. Registrar metadatos, referencias de objeto, versión y estado en PostgreSQL. No almacenar imágenes binarias en GitHub ni URLs públicas como única fuente de verdad.
5. Vista previa aislada y revisión del administrador; no modificar la dirección pública ni la ruta legada.
6. Publicación explícita y atómica por código AD507, con mecanismo reversible que conserve la versión anterior.
7. Verificar logo, galería, ubicación, botones, rendimiento móvil/tablet, enlaces públicos y QR. Registrar resultado por dirección.
8. Solo entonces marcar MIGRADA. Ante error, revertir la resolución del código al sistema anterior.

## Rutas y compatibilidad
- Resolver cada código AD507 hacia versión NUEVA solo cuando exista publicación aprobada; en otro caso continuar ruta LEGADA sin cambios.
- No redirigir códigos antiguos a otros códigos. Preservar SEO y enlaces compartidos.
- Las nuevas altas tras el corte operativo usan el panel nuevo; las anteriores permanecen legadas hasta migración.
- Separar el entorno de prueba del servicio de producción. No aplicar migraciones de datos sin respaldo y autorización.

## Imágenes y velocidad
- Google Drive puede mantenerse como respaldo de originales, pero no como origen de carga de imágenes públicas.
- R2 para objetos y entrega mediante dominio/caché apropiados. Comprimir, dimensionar, usar formatos web cuando convenga, lazy loading para galería.
- Medir antes/después con la misma dirección, conexión y dispositivo. No atribuir toda la latencia a las imágenes sin medición.
- El visitante nunca invoca Apps Script para servir fotos.

## Puertas de aprobación
A. Inventario técnico: esquema PostgreSQL, rutas, formularios, permisos, proceso actual de fotos y pruebas.
B. Configuración R2 aislada, credenciales y reglas de acceso; sin cambiar DNS de producción.
C. Flujo completo en entorno de prueba con ficha sintética y validaciones por plan.
D. Una migración real aprobada, manteniendo original y rollback.
E. Migraciones individuales; no procesamiento masivo.
F. Auditoría de cero dependencias del legado, respaldo histórico y autorización separada para desconectar Excel/Apps Script.

## Alcance de este PR
Documentación exclusivamente. No modifica panel, servicios, tablas, direcciones ni despliegues.
