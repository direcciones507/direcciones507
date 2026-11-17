# Mapa en Vivo | Especificación de implementación (fase 1)

Estado: desarrollo aislado. No desplegar ni fusionar sin aprobación.

## Reglas invariables
- Módulo adicional compartido para Direcciones507 y LATAM; no modificar los flujos existentes de direcciones digitales, enlaces, códigos, QR, pagos o el módulo «Agregar lugar» (parques, iglesias, cascadas).
- Nuevo flujo «Agregar establecimiento» para comercios; buscador, «Agregar establecimiento» y «Actualizar actividad» superpuestos dentro del área del mapa, diseño móvil primero.
- Consulta pública; para publicar, reclamar o reportar exigir sesión existente Google/correo, conservar lugar y acción al autenticar.
- Ciudadano: nombre, categoría, territorio, pin seleccionable/movible, GPS opcional, reportes generales con controles anti-duplicados y anti-abuso. No puede administrar fichas comerciales.
- Comerciante: RUC o equivalente por país, razón social, teléfono, dirección y pin. «Reclamar mi negocio» sobre ficha existente. El RUC por sí solo no verifica propiedad.
- Verificación gratuita por video continuo enviado al WhatsApp oficial mostrando fachada, interior y aviso de operaciones (cuando aplique), con código de solicitud. Revisión manual ADMIN y respuesta estimada 24–48 h; alternativa presencial por personal autorizado. Sin cédula ni video en almacenamiento propio. Aprobación únicamente tras comprobar autorización; registrar auditoría y permitir disputas.
- Negocio verificado: editar ficha/pin, horario y disponibilidad cuantificada, por categoría (mesas, habitaciones, espacios, aforo, etc.). Ciudadanos solo observaciones generales. Mostrar fecha/hora y caducidad de datos.
- Formularios dinámicos por categoría: restaurante, hotel, alojamiento vacacional, bar, banco, supermercado, farmacia, estacionamiento, oficina pública y otros. Información operativa y teléfono gratuitos.
- PWA instalable y acceso directo al mapa, sin duplicar autenticación.
- Preparar modelo de ficha ampliada y publicidad EN VIVO/DESTACADO, pero bloquear contratación y cobros nuevos en interfaz **y servidor**; no hacer pruebas de pago real.
- No tocar producción ni datos históricos; implementar migraciones aditivas y pruebas en entorno aislado.

## Secuencia de implementación
1. Inventariar autenticación, rutas, modelos PostgreSQL, panel ADMIN, mapas y PWA existentes; elegir componentes reutilizables.
2. Crear esquema aditivo: establishments, claims, managers, activity_reports, live_status, categories, audit_events y límites de abuso. Migraciones reversibles.
3. Endpoints con autorización servidor: lectura pública, crear establecimiento, reportar, reclamar, revisión ADMIN, actualizar estado por gerente verificado.
4. UI mapa responsive con pin arrastrable, búsqueda y formularios dentro del mapa; conservar «Agregar lugar» intacto.
5. Panel «Mis negocios», verificación WhatsApp manual, categorías y disponibilidad.
6. PWA, pruebas funcionales/seguridad/móviles/rendimiento; PR de revisión. Sin merge ni despliegue sin aprobación.

## Criterios de aceptación
- Invitado consulta; contribución requiere login y retorna a acción previa.
- Reporte repetido no genera 200 entradas; estado vencido no se anuncia como actual.
- Una cuenta no puede editar establecimientos ajenos, ni aprobar su propia reclamación.
- Duplicados y pin erróneo son corregibles con auditoría.
- Nuevos cobros inaccesibles también por API.
- Funciones existentes de 507/LATAM y «Agregar lugar» sin regresiones.
