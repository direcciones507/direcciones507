# DIRECCIONES 507/LATAM | Checklist de construcción: Novedades y destacados

**Fecha de aprobación:** 18 de octubre de 2026  
**Repositorio:** `direcciones507/direcciones507`  
**Estado:** APROBADO PARA CONSTRUIR. NO IMPLEMENTADO.  
**Visibilidad pública inicial:** OCULTA, incluso si existen publicaciones.

## Objetivo
Construir una vitrina visual multinacional para noticias breves, comercios y lugares destacados. El propietario debe poder gestionar todo desde el ADMIN existente sin tocar GitHub para cada publicación. Construir y desplegar la funcionalidad, pero mantener la sección pública invisible hasta activación expresa desde ADMIN.

## 1. Panel ADMIN
- [ ] Crear apartado «Novedades y destacados» dentro del ADMIN actual.
- [ ] Crear, editar, duplicar y archivar publicaciones.
- [ ] Guardar borradores, publicar u ocultar individualmente.
- [ ] Subir fotografía principal y fotografías adicionales.
- [ ] Editar título, descripción breve y cuerpo de la novedad.
- [ ] Elegir país y categoría: comercio, lugar o noticia.
- [ ] Vincular opcionalmente una dirección digital existente, sin modificarla.
- [ ] Ordenar publicaciones y marcar destacadas.
- [ ] Previsualizar antes de publicar.

## 2. Presentación pública (preparada pero oculta)
- [ ] Construir tarjetas con fotografía, título, resumen y ubicación/país, responsive para móvil, tablet y escritorio.
- [ ] Preparar vista de detalle con galería fotográfica y enlace a la dirección digital vinculada.
- [ ] Reutilizar un único componente compartido para Direcciones507 y LATAM, con filtrado por país.
- [ ] No mostrar secciones, contenedores vacíos ni enlaces públicos mientras la función esté desactivada.
- [ ] No crear un buscador territorial visible; esa función se pospone por decisión del propietario.

## 3. Datos, seguridad y compatibilidad
- [ ] Reutilizar Core multinacional, PostgreSQL y R2 existentes; evitar servicios y costos nuevos innecesarios.
- [ ] Limitar altas, modificaciones, orden y archivo a ADMIN autenticado y autorizado.
- [ ] Validar datos, tipo/tamaño/formato de archivos y optimizar imágenes.
- [ ] Conservar historial de cambios y evitar pérdida accidental.
- [ ] Garantizar que borradores y publicaciones ocultas no sean accesibles públicamente, incluso por URL directa o API.
- [ ] Respetar el país seleccionado y la disponibilidad de LUGARES solo en países habilitados.
- [ ] No tocar Excel, Apps Script, Pages, códigos, URL, QR ni registros históricos.

## 4. Activación controlada
- [ ] Incorporar un control global de visibilidad, inicialmente DESACTIVADO.
- [ ] Permitir activar/desactivar desde ADMIN autorizado, con confirmación y auditoría.
- [ ] Permitir preparar contenido desde ADMIN aun con sección pública desactivada.
- [ ] Mantener separadas la aprobación/publicación individual y la activación global.
- [ ] No activar automáticamente por cantidad de direcciones, lugares o publicaciones.
- [ ] Conservar ocultamiento tras despliegues y reinicios; el valor por defecto debe ser cerrado.

## 5. Entrega y aceptación
- [ ] Implementar reutilizando código y componentes actuales, sin reconstrucción paralela.
- [ ] Preparar migración versionada solo si es necesaria; respaldo y autorización antes de aplicar cambios productivos.
- [ ] Probar cargas de fotos, edición, borradores, permisos, visibilidad y filtros por país.
- [ ] Comprobar diseño en móvil, tablet y escritorio.
- [ ] Desplegar con sección pública DESACTIVADA.
- [ ] Comprobar en producción que ADMIN puede gestionar publicaciones y que el público no ve la sección.
- [ ] Registrar PR, commit, pruebas, despliegue y estado real en el checklist maestro.

## Criterio de terminado
El propietario puede entrar a ADMIN, subir imágenes, crear/editar/guardar/previsualizar una novedad y administrarla sin GitHub; mientras tanto, ninguna portada pública muestra la sección. La activación pública se realizará solo con una decisión posterior del propietario.

**Nota:** Todos los puntos están pendientes hasta que exista evidencia. Este documento registra alcance aprobado, no implementación ni autorización para publicar contenido.
