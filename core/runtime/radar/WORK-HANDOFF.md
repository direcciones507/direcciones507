# RADAR: entrega técnica a Work
## Alcance
Repositorio direcciones507/direcciones507, rama feature/radar-en-vivo, PR #301. Consolidar solamente tras CI verde. Este documento no autoriza fusionar main, ejecutar SQL ni publicar.
## Nuevas funciones
- Reportes anónimos (0017), confirmaciones y contradicciones (0018), entorno con GPS voluntario, Pulso en vivo, favoritos (0019), contribuciones, reputación, alertas por favorito (0020).
- Los reportes caducan en 30 minutos. GPS de cercanía se calcula localmente; no certifica presencia. La consulta de entorno usa cuadrícula aproximada. No hay envío externo de alertas: se consultan mientras su ventana está abierta.
- Reputación privada de 90 días con corroboración de cuentas distintas, no acredita exactitud ni modifica pines comerciales.
## Puertas previas a publicación
1. Verificar PR #301, ramas dependientes y CI del SHA final (no solo SHA previo). Revisar artefactos de navegador y probar móvil/tablet reales. Las pruebas simuladas no sustituyen integración real.
2. Verificar backup restaurable de PostgreSQL, ledger y checksums de 0009–0020 contra el entorno real. Revisar dependencias y migraciones pendientes en orden; detenerse ante divergencias. No ejecutar sobre producción sin autorización.
3. Verificar sesión CORE en radar.direcciones.lat con Google y correo, retorno a la acción, permisos ADMIN y titularidad. Probar en staging con cuentas separadas, confirmar que no hay filtración de favoritos, contribuciones o alertas.
4. Verificar ingreso de red en Railway antes de activar anónimos: createRadarIntegration requiere callback trustedPeer proporcionado por el servidor y secreto de al menos 32 bytes. Hoy el servidor no lo inyecta. No confiar en headers aportados por el cliente. Mantener RADAR_ANONYMOUS_REPORTS_ENABLED=false hasta verificar topología/proxy, comportamiento con IPv4/IPv6, NAT, intentos de suplantación y límites. No registrar IP cruda o secretos.
5. Activar flags en staging solamente después de migraciones verificadas: RADAR_ENABLED, RADAR_ACTIVITY_VALIDATION_ENABLED, RADAR_FAVORITES_ENABLED, RADAR_CONTRIBUTIONS_ENABLED, RADAR_REPUTATION_ENABLED, RADAR_ALERTS_ENABLED (requiere favoritos); revisar flags existentes de propiedad, enlaces, detalles de negocio y comercial según alcance aprobado. Luego revisar autenticación, datos reales, expiración, límites y conexiones. No activar cambios de pagos, temporales ni históricos.
6. Confirmar capacidad de consultas, plan de retención, prueba de abuso y rollback por flags. No deshacer migraciones mediante borrado de datos. Documentar evidencia, SHA y decisión de publicación.
## Validaciones
Workflow Radar: unitarias, PostgreSQL aislado, navegador original y flujos comunitarios aislados. El nuevo navegador intercepta API y usa datos ficticios únicamente en prueba; no prueba sesiones reales ni la red Railway. Mantener todos los controles CORE. Publicación únicamente con aprobación separada.
