# Radar: arquitectura obligatoria

Radar es un módulo de Direcciones, no una plataforma independiente. Tres dominios, un CORE compartido.

- Reutilizar identidad, cuentas, autenticación Google/correo, recuperación, correo transaccional, PostgreSQL, almacenamiento R2, pagos y ADMIN existentes.
- No crear usuarios, contraseñas, tablas de identidad, proveedores de correo ni sistemas de pago paralelos.
- Verificar el flujo de autenticación centralizado existente; dominios distintos requieren intercambio seguro de sesión, no cookies compartidas entre dominios raíz. Preservar retorno al mapa y acción solicitada mediante destinos permitidos.
- Consulta pública; escritura, reportes y altas requieren identidad existente. Permisos y moderación en servidor.
- MapLibre GL JS como motor previsto; validar proveedor de teselas, licencia y rendimiento. GSAP/ScrollTrigger y Three.js selectivo para presentación; respetar movimiento reducido.
- Cobros deshabilitados por defecto; precios configurables pendientes de recuperar y verificar contra acuerdos definitivos.
- Mantener rama aislada. No migraciones en producción, merge ni despliegue sin aprobación. Revisar divergencia con main antes de integrar.
