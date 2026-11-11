# Dirección Temporal — checklist de salida a producción

Estado: PENDIENTE DE IMPLEMENTACIÓN. No confundir la tarjeta comercial visible con el producto operativo.

## Reglas aprobadas
- Disponible en direcciones507.com y direcciones.lat sobre el mismo core existente.
- Sustituye Negocio Gratis. Residencial permanece oculto comercialmente, sin borrar funcionalidad ni registros.
- Precio fijo US$4.99 para evento de 1 a 30 días.
- Título visible: nombre del evento o actividad (ej. Fiesta de 15 años de María Sofía). NO emitir código AD507, código comercial ni dirección permanente. Usar solo URL con slug derivado del nombre (ej. /evento/15-anos-de-maria-sofia); resolver colisiones con sufijo corto opaco, sin exponer identificadores internos. QR opcional apunta exclusivamente al enlace temporal.
- SEO: ficha temporal noindex, nofollow y no incluida en sitemap ni listados indexables; enlace directo compartible mientras esté vigente.
- Música ambiental opcional para la ficha temporal, desactivada inicialmente; reproducir solo tras interacción explícita del visitante (restricciones de autoplay móvil), con controles reproducir/pausar, silenciar y volumen. Usar audio propio o con licencia válida, nunca música protegida sin autorización. El carrusel de fotos funciona independientemente del audio.
- Open Graph dinámico por ficha: og:title = nombre del evento, og:description = descripción pública resumida, og:image = foto principal autorizada y accesible públicamente, og:url = enlace canónico temporal. Incluir twitter:card=summary_large_image y twitter:image. Metadatos generados en HTML inicial del servidor para que WhatsApp y redes sociales los lean sin JavaScript.
- Responsable: nombre, teléfono y correo privados y obligatorios.
- Contacto público: nombre y teléfono autorizados explícitamente; no publicar automáticamente datos privados.
- Ubicación: país, provincia, distrito, corregimiento, referencia, coordenadas y navegación; fecha de inicio y fin, descripción y horarios.
- Máximo 3 fotos: 1 principal obligatoria y 2 adicionales opcionales.
- Carrusel de ficha: transición suave cada 3.5 segundos; indicadores de puntos interactivos; swipe táctil; al completar una vuelta volver a principal y detenerse; interacción manual detiene autoplay. Respetar prefers-reduced-motion.
- La dirección sigue activa el día completo posterior a la fecha final del evento, con zona horaria local del evento; expira a las 00:00 del segundo día posterior.
- No publicar antes de pago confirmado por webhook/IPN verificado e idempotente.
- Preservar planes Premium y Premium Pro, Lugar y direcciones históricas Excel.

## Desarrollo requerido
- [ ] Modelo de datos, migración reversible y validación de 1–30 días.
- [ ] Formulario autenticado con datos públicos/privados y selección de fotos.
- [ ] Subida de imágenes a R2 con límites, sanitización y permisos.
- [ ] Vista previa, edición y confirmación de datos.
- [ ] Cotización exacta de US$4.99 en backend, creación de orden e integración con Yappy existente sin cobros duplicados.
- [ ] Confirmación de pago por IPN firmado; activación idempotente, estado pendiente/error y conciliación.
- [ ] Ficha pública noindex, enlace amigable basado en el nombre (sin AD507), QR del enlace, navegación y carrusel aprobado.
- [ ] Música ambiental opcional, con licencia verificada, reproducción solo tras toque del usuario, controles de audio y prueba en móvil.
- [ ] Open Graph por evento con foto principal, título, descripción y URL; verificar vista previa de enlace en WhatsApp y redes sociales sin indexar la ficha.
- [ ] Vencimiento automático y comprobación del estado en cada lectura; manejo de zona horaria.
- [ ] CTA desde tarjeta de precios y desde panel autenticado en ambos dominios.
- [ ] Corregir textos, precios y pruebas que aún refieran a Negocio Gratis/Residencial como ofertas activas.
- [ ] Pruebas automatizadas: fechas 1 y 30 días, límites, privacidad, carga 1/2/3 fotos, swipe, pago exitoso/pendiente/rechazado, IPN duplicado, expiración y regresión de otros planes.
- [ ] Validar visual móvil y escritorio, HTTPS, CORS y sesión en ambos dominios.
- [ ] Revisar migración y respaldo de PostgreSQL, publicar en Railway ad507-core y confirmar despliegue saludable.
- [ ] Prueba real de US$4.99 por propietario; comprobar recepción del pago, publicación y QR.
- [ ] Confirmar públicamente «listo para vender» solo después de pruebas y despliegue.

## Infraestructura existente
Repositorio: direcciones507/direcciones507; Railway proyecto amused-enchantment, servicio ad507-core, rama main. No crear nuevos servicios ni modificar otros proyectos.
