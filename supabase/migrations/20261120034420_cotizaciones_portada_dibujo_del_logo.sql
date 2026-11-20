-- La celda logo de la tarjeta dibuja sólo el logo, entero en la celda menos su relleno y alineado como la celda, y el logo que el dibujo no lee (WebP, un SVG con
-- estilos) se convierte a PNG: cambia cómo se dibuja la imagen de la tarjeta, así que las portadas guardadas se rehacen.
create or replace function public._portada_version_del_dibujo() returns integer
  language sql immutable
  set search_path = ''
  as $$ select 2 $$;

revoke all on function public._portada_version_del_dibujo() from public;
grant all on function public._portada_version_del_dibujo() to service_role;

comment on function public._portada_version_del_dibujo() is 'La versión del dibujo de la portada de la cotización: se sube en una migración cuando cambia cómo se dibuja la imagen de la tarjeta (infra/tarjeta/imagen/, geometriaDeLaTarjeta, webp-de-la-tarjeta.ts, logo-de-la-tarjeta.ts). Entra en _cotizacion_portada_clave.';
