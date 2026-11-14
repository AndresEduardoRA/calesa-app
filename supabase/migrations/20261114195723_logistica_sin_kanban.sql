-- El kanban de `/logistica` se va: la cadena entera de un origen (la primera página de cada columna) ya no se pide. Su lugar lo toma el número de cada fase
-- (`logistica_cadena_resumen`) y la lista de una fase se sigue leyendo con `logistica_cadena_columna`, de a una página por cursor.
-- Pruebas: supabase/tests/areas/mover/cadena.sql y resumen.sql; medición: medir-logistica.sql.

drop function public.logistica_cadena(uuid, integer, jsonb);

comment on function public.logistica_cadena_columna(uuid, uuid, timestamp with time zone, uuid, integer, jsonb) is 'La lista de una fase de la cadena de logística (6.02-2): {tarjetas: [{id, titulo, vin, lote, fase_desde, situacion, demorada, contenedor, booking, eta_el}], hay_mas}, por cursor (fase_desde, id) sobre vehiculos_cadena_idx (sin las no ganadas); p_fase nulo = «Sin fase» (por id). Con el alcance «propios» parte de _logistica_lo_propio. Definer: el alcance es el menor de logistica.ver y vehiculos.ver del origen, resuelto una vez (42501 hint acceso si no lo hay). Filtros: q, demoradas, por_aprobar, contenedor, booking, naviera (22023 hint filtros); fase ajena o sin es_logistica, 22023 hint p_fase; cursor sin p_desde, 22023 hint cursor.';
