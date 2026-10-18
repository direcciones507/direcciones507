# DIRECCIONES 507/LATAM | Pendiente posterior a Yappy: enlace personalizado Premium Pro y tarjetas

**Estado:** PENDIENTE. **Prioridad:** después de terminar, probar y activar Yappy Panamá en producción. **Ámbito:** direcciones507.com y direcciones.lat, Core multinacional y tarjetas de planes de ambos sitios.

## Decisión comercial aprobada (18-oct-2026)

- **Solo Premium Pro ($39.99)** ofrece al cliente elegir un enlace público exclusivo con el nombre de su negocio, por ejemplo `https://direcciones.lat/restaurante-margarita` o `https://direcciones507.com/salon-carla`.
- La dirección interna AD507/AD506 y sus identificadores se conservan para trazabilidad. El enlace anterior y los QR existentes deben seguir abriendo; no tocar el histórico, Excel ni Apps Script.
- El cliente propone un nombre legible (slug), con vista previa, comprobación de disponibilidad y reglas contra duplicados, suplantaciones, nombres reservados y conflictos entre países y dominios.
- Al vencimiento del plan se suspenden los beneficios Premium Pro, **sin eliminar ni reasignar** el enlace personalizado, su código ni QR; mantener redirecciones y compatibilidad.
- Premium, Residencial/Persona y planes gratuitos **no** reciben esta nueva opción Premium Pro. Respetar las reglas existentes sobre códigos personalizados adquiridos anteriormente.
- Usar el mismo Core multinacional, un solo generador, panel cliente y ADMIN. Panamá y LATAM deben compartir lógica, sin crear sistemas separados.

## Tarjetas y formularios: ambos sitios

1. Revisar y actualizar **todas las tarjetas de planes** de `direcciones507.com` y `direcciones.lat`, con precios, beneficios y textos coherentes con los planes habilitados en cada país.
2. Destacar en Premium Pro el beneficio **«Enlace exclusivo con nombre de tu negocio»**, con ejemplo visible.
3. Incorporar selección y validación del enlace en el formulario Premium Pro y mostrarlo en Mi cuenta, ficha, compartir y QR.
4. Mantener Negocio Gratis y Lugar Gratis sin cobro; no cambiar su disponibilidad ni sustituir tarjetas sin autorización específica del propietario. Residencial/Persona continúa oculto hasta el cambio visual acordado.
5. Diseño responsivo móvil/tablet/escritorio, tipografía y botones consistentes; evitar duplicados de tarjetas y textos.
6. Verificar por país los dominios, prefijos, planes y productos habilitados. No prometer enlaces personalizados fuera de Premium Pro.

## Checklist de ejecución

- [ ] Completar primero Yappy Panamá (PR #110), con verificación de pago real, IPN y activación correcta.
- [ ] Revisar checklist maestro y versión actual de main; reutilizar implementaciones existentes.
- [ ] Diseñar esquema de slugs únicos y política de cambios de nombre, reservas y redirecciones permanentes.
- [ ] Implementar API, controles de propiedad/autorización, validación, ficha pública y QR.
- [ ] Actualizar tarjetas y formularios en Panamá y LATAM, sin alterar flujos gratuitos ni históricos.
- [ ] Probar conflictos, países, vencimiento, redirecciones, enlaces anteriores y responsive.
- [ ] Integrar, desplegar y verificar físicamente producción antes de marcar **OPERATIVO**.

**No implementar ni desplegar esta fase mientras Yappy no esté cerrado.**
