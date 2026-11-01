# Política propuesta: códigos personalizados, soporte y Natalie

Estado: especificación para implementación y pruebas. No habilitar transferencias sin flujo de verificación.

## Alcance
Solo direcciones nuevas Premium y Premium Pro de Direcciones507/LATAM. No modificar direcciones históricas, Excel, códigos, QR ni enlaces existentes.

## Reglas
- El código personalizado se elige al crear la dirección y queda bloqueado al publicarse. El resto de datos editables conserva su flujo.
- Un código personalizado es único en toda Direcciones507/LATAM, independientemente del país, con comparación sin distinguir mayúsculas/minúsculas. El nombre comercial sí puede repetirse. Verificar códigos vigentes, alias e históricos y rechazar duplicados en una transacción segura. Cuando esté ocupado, sugerir una variante con sufijo del país (ej.: restaurante-maria-pa, restaurante-maria-cr, restaurante-maria-co), sujeta a comprobación de disponibilidad.
- Mantener el formato actual de URL y el enrutador; no introducir segmentos por país ni modificar el generador de QR. No permitir códigos homónimos en países distintos.
- Corrección excepcional de error tipográfico: solicitud a soporte, verificación de titularidad y revisión ADMIN. Atención estimada de 3 a 5 días hábiles, no garantía de aprobación.
- Al corregir un código, reservar el alias anterior, devolver redirección HTTP 301 al nuevo enlace y actualizar canonical, og:url, og:title, og:description, og:image y sitemap. Verificar que los rastreadores reciban HTML correcto y que la imagen OG sea accesible. No crear 404 por cambios de código.
- Transferencia por venta del negocio: conservar URL, código y QR; solicitar documentación al nuevo titular, notificar al titular registrado y conceder 7 días calendario para responder. El silencio no equivale a aprobación; ADMIN decide tras verificar evidencia y resolver oposiciones. Registrar decisiones y eventos de auditoría. No revelar datos privados entre solicitantes.
- Ningún código anterior puede ser asignado a otro negocio sin procedimiento formal y garantías de no desviar enlaces existentes.

## Ayuda
Título: Problemas con mi código o dirección digital.
Opciones: Perdí mi código o enlace; Cometí un error en el código; Compré un negocio y quiero reclamar su dirección; Mi código aparece ocupado.
Explicar recuperación desde Mi cuenta y canal de soporte configurado; no inventar correo de contacto.

## Natalie
Usar exactamente estas reglas para responder, orientar y dirigir a soporte. No modificar códigos, aprobar solicitudes, transferir titularidad, revelar correos privados ni prometer aprobación automática. Distinguir corrección (3 a 5 días hábiles de atención) de transferencia (7 días calendario para respuesta del titular registrado). Explicar que el código es único globalmente y sugerir variantes con las siglas del país cuando esté ocupado.

## Pruebas de aceptación pendientes
- UI no muestra editor de código publicado; API rechaza namedCode incluso si el usuario fabrica la petición.
- Ediciones de teléfono, fotos, nombre comercial, ubicación y contactos siguen funcionando.
- Duplicados rechazados en todos los países, sin distinguir mayúsculas/minúsculas; sugerencias por país verificadas; no modificar enlaces ni QR existentes.
- Alias históricos y cambios anteriores no se reasignan; redirección 301, canonical, OG y sitemap correctos.
- Soporte, notificaciones, plazo, oposición y aprobación ADMIN auditables.
- Natalie y Ayuda responden sin contradicciones.
- Sin cambios de producción, Railway, despliegues, PR ni GitHub Actions hasta autorización.

## Texto del formulario aprobado
Elige tu código personalizado. Este código formará parte de tu enlace permanente. Puedes utilizar letras, números y guiones (-). No se permiten espacios, puntos ni comas. Si el nombre ya está registrado, puedes agregar las iniciales de tu país, por ejemplo restaurante-maria-pa, restaurante-maria-cr o restaurante-maria-co. Revisa cuidadosamente tu código antes de publicar: después no podrás modificarlo desde Mi cuenta. Para errores, solicita una corrección a soporte; atención estimada de 3 a 5 días hábiles.
