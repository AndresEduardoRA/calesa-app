-- Las preferencias de la lista de cotizaciones (`docs/UX.md` › «Cotizaciones»): cómo la ve en escritorio (`cotizaciones.vista`, tabla o tarjetas, como
-- `vehiculos.vista`) y si la ve agrupada por vehículo (`cotizaciones.agrupar`, un booleano). Sin fila, lo de fábrica: tarjetas y agrupada (lo decide la app).
-- La base sólo admite esos valores; cualquier otra clave no se mira. La policy de siempre deja escribir sólo la fila propia.
alter table public.preferencias_usuario
  add constraint preferencias_vista_de_cotizaciones_valida
    check (clave <> 'cotizaciones.vista' or valor = any (array['"tabla"'::jsonb, '"tarjetas"'::jsonb])),
  add constraint preferencias_agrupar_cotizaciones_valida
    check (clave <> 'cotizaciones.agrupar' or jsonb_typeof(valor) = 'boolean');
