# Estadísticas Core: Premium / Premium Pro (alcance aprobado 2026-10-17)

Estado: EN DESARROLLO, SIN DESPLIEGUE. Este documento es la puerta de seguridad previa a editar runtime.

## Reutilizar, no reconstruir
- Inspeccionar first-party business analytics ingestion, summaries, magic-link/session y esquema PostgreSQL `ad507` antes de tocar tablas o rutas.
- Mantener intactos analytics históricos, Apps Script/Excel, QR, OWNER/PIN, Natalie, códigos, autenticación y fichas públicas antiguas.
- Confirmar catálogo de beneficios y contratos antes de alterar contador anunciado en Negocio Gratis. No quitar una función preexistente por asumir una matriz nueva.

## Implementación en cambios pequeños
1. Contraste: localizar CSS del detalle de solicitud y ajustar solo color de texto secundario sobre fondo claro en panel compartido 507/LATAM; comprobar contraste visual y regresiones.
2. Instrumentación: localizar renderizado de fichas públicas Core nuevas y emisión actual de eventos; aprovechar endpoints existentes y no duplicar registros. Solo fichas públicas habilitadas; nunca ubicación privada residencial.
3. Normalización: consultas read-only por dirección y titular autenticado, con autorización servidor, sin exponer métricas de otras cuentas.
4. Premium: visitas totales. Premium Pro: visitas totales, serie diaria 7/30 días y clics en acciones realmente disponibles (Maps/Waze/Uber/WhatsApp/llamar/compartir/QR según soporte real).
5. Antiinflado: definir e implementar deduplicación temporal proporcionada sin identificar personas innecesariamente; pruebas de recarga, navegadores y eventos repetidos.
6. Respetar consentimiento de analítica opcional; separar métricas propias de Google Analytics y no activar etiquetas de terceros por defecto.
7. Si requiere SQL: migración aditiva y compatible con namespace real `ad507`, revisada en base aislada, sin ejecutar DDL en producción sin autorización.

## Criterios de cierre
- Tests de autorización, privacidad, contador, duplicados, serie temporal y plan; CI verde.
- Pruebas visuales y físicas móvil/tablet/escritorio en ambos dominios.
- Prueba de no regresión en fichas históricas, OWNER, Natalie y rutas de analítica antiguas.
- Verificar producción después de autorización específica de despliegue. No declarar operativo solo por CI.
- No conectar ni activar pasarelas de pago en este cambio.
