# Premium y Premium Pro — cierre de estadísticas

## Cambio

Se reutilizan los eventos PostgreSQL, autorización por propiedad, cargador de tarjetas y gráficos del PR103. Premium y Pro muestran separadamente WhatsApp, Google Maps, Waze, Uber y Llamar; QR, compartir y otras acciones se muestran cuando existen registros. Los clics no acreditan conversaciones, llamadas ni viajes completados. Sin registros se muestra ese estado, nunca un cero inferido.

Premium Pro conserva «Ver estadísticas avanzadas», con dos gráficos diarios separados y selector de 7/30/90 días, por calendario de Panamá. El servidor limita la ampliación de período a Pro, valida parámetros y vuelve a comprobar propiedad y plan después de consultar. No se incorporan datos inventados ni nuevas fuentes de seguimiento.

Negocio Gratis y Lugar Gratis conservan HTML, captura, deduplicación, controles y período de 30 días. Comparación local con main10407ee: seis casos HTML idénticos (ambos planes × registros/ausencia/no disponible). La función track es idéntica a main. El ajuste global de deduplicación del PR105 no se incorpora.

## Archivos

- analytics-summary-view.ts: métricas por botón y selector Pro.
- analytics-repository.ts: consulta acotada por período Pro; revalidación del plan.
- user-panel.ts: actualización del selector dentro de la tarjeta sin duplicar panel/formularios.
- shared-visual-style.ts: estilos compactos circunscritos a acciones y selector.
- tests/analytics-summary-view.test.ts y analytics-integration.test.ts: presentación, períodos, propiedad, eventos persistidos y compatibilidad.
- scripts/analytics-isolated-browser.ts y analytics-real-browser.cjs: recorrido real de navegador con PostgreSQL descartable, autenticación del Core (intercambio externo Google simulado), ficha pública, captura y lectura privada. Solo admite PostgreSQL local; no crea cuentas o suscripciones en producción.
- scripts/analytics-browser.cjs: mantiene las pruebas visuales existentes para ambos dominios y seis combinaciones de tamaño/dominio.
- .github/workflows/analytics-validation.yml: PostgreSQL aislado para el recorrido adicional; evidencias de tres tamaños.

## Límites

No hay nuevas migraciones SQL productivas, cambios en precios, pagos, publicación, generadores, históricos, Excel, R2 o autenticación. La migración de eventos previamente aprobada no se repite. SEO permanece en su estado previo hasta verificar y cerrar la fase de estadísticas. Los resultados definitivos y el despliegue se consignan en el PR106; una prueba aislada no se presenta como sesión privada de un propietario en producción.
