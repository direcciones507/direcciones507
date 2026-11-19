# Radar: arquitectura obligatoria

Radar es un módulo de Direcciones, no una plataforma independiente. Tres dominios, un CORE compartido.

- Reutilizar identidad, cuentas, autenticación Google/correo, recuperación, correo transaccional, PostgreSQL, almacenamiento R2, pagos y ADMIN existentes.
- No crear usuarios, contraseñas, tablas de identidad, proveedores de correo ni sistemas de pago paralelos.
- Verificar el flujo de autenticación centralizado existente; dominios distintos requieren intercambio seguro de sesión, no cookies compartidas entre dominios raíz. Preservar retorno al mapa y acción solicitada mediante destinos permitidos.
- Consulta pública; escritura, reportes y altas requieren identidad existente. Permisos y moderación en servidor.
- MapLibre GL JS como motor previsto; validar proveedor de teselas, licencia y rendimiento. GSAP/ScrollTrigger y Three.js selectivo para presentación; respetar movimiento reducido.
- Cobros deshabilitados por defecto; precios configurables pendientes de recuperar y verificar contra acuerdos definitivos.
- Mantener rama aislada. No migraciones en producción, merge ni despliegue sin aprobación. Revisar divergencia con main antes de integrar.

## Approved domain decision

Radar canonical public hostname: `radar.direcciones.lat`, replacing the previously proposed Direcciones507-based Radar hostname. Keep `direcciones507.com` and `direcciones.lat` unchanged. Use the shared CORE, database and existing accounts. DNS (Cloudflare), Railway custom domain/TLS, exact allowed origins, Google OAuth callbacks and secure cross-domain session/return flows must be verified before public release. Configuration explicitly deferred until later; no DNS or production changes authorized by this decision. Continue infrastructure development in the feature branch.

## Approved visual release requirements

Use navy, silver and restrained blue, no neon or purple. Cinematic 3D entrance and smooth scroll storytelling with GSAP ScrollTrigger, selective Three.js/WebGL, parallax, animated map pins, cards and transitions. MapLibre remains the interactive map engine. Preserve fast access to map, mobile performance, reduced-motion fallback, keyboard accessibility and static fallback if WebGL fails. Motion must not block map search, login or reporting. Validate these before release.

## Shared account entry (owner-approved)
Reuse the existing Direcciones507/LATAM login card and its actual shared rendering, styles, animations, Google/email registration, verification and password recovery. No separate Radar login design or identity database. Preserve the originating Radar action and validated local return destination through authentication, without exposing credentials or accepting arbitrary external return URLs. Host-bound cookies remain isolated; account identity is shared. Verify the three entry points visually, on mobile and desktop, and test return-to-action before release.
