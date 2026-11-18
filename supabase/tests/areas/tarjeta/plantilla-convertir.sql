-- `_plantilla_convertir()`: la plantilla de hoy (forma 1) convertida a la cuadrícula al leerla. T1 corre el juego espejo
-- `src/modules/cotizaciones/entities/plantilla/casos-de-conversion.json` (tabla `_juego_de_conversion`), el que genera `convertirPlantilla()` de TS.
-- docs/COTIZADOR.md › «Plantilla de tarjeta (PDF)». Cada bloque abre su transacción y la revierte.

-- @test plantilla-convertir T1: cada caso del juego da exactamente la cuadrícula que da convertirPlantilla() de TS (igualdad de jsonb)
begin;
do $$
declare j jsonb; c jsonb; fo jsonb; v_dio jsonb; v_malos text[] := '{}'; v_n int := 0;
begin
  select doc into j from pg_temp._juego_de_conversion;
  if j is null then raise exception 'no se cargó casos-de-conversion.json'; end if;
  for c in select * from jsonb_array_elements(j -> 'casos') loop
    v_n := v_n + 1;
    fo := j -> 'formulas' -> (c ->> 'formula');
    if fo is null then raise exception 'el caso «%» nombra una fórmula que no está', c ->> 'nombre'; end if;
    v_dio := public._plantilla_convertir(c -> 'plantilla', fo -> 'definicion', fo -> 'diseno', coalesce(c -> 'visibilidad', fo -> 'visibilidad'),
                                         array(select jsonb_array_elements_text(c -> 'tonos')));
    if v_dio is distinct from c -> 'esperada' then
      v_malos := v_malos || format('«%s»: %s', c ->> 'nombre',
        coalesce((select string_agg(k, ', ') from (select k from jsonb_object_keys(c -> 'esperada') k where v_dio -> k is distinct from c -> 'esperada' -> k) x), '?'));
    end if;
  end loop;
  if v_n < 10 then raise exception 'el juego trae % casos', v_n; end if;
  if cardinality(v_malos) > 0 then raise exception '% de % casos no dan lo de TS (claves distintas): %', cardinality(v_malos), v_n, array_to_string(v_malos, ' | '); end if;
end $$;
rollback;

-- @test plantilla-convertir T2: la plantilla v1 de cada origen (la de su semilla o la mínima de seed.sql) se convierte contra la v1 de su fórmula y lo convertido valida como cuadrícula
begin;
do $$
declare r record; v_conv jsonb; v_n int := 0;
begin
  for r in select o.clave, p.definicion as pla, f.definicion as def, f.diseno, f.visibilidad
             from public.origenes o join public.plantillas_tarjeta p on p.origen_id = o.id and p.version = 1
             join public.formulas f on f.origen_id = o.id and f.version = 1 loop
    v_n := v_n + 1;
    perform public.validar_plantilla(r.pla, r.def, r.diseno, r.visibilidad, null);
    v_conv := public._plantilla_convertir(r.pla, r.def, r.diseno, r.visibilidad, array(select t.clave from public.tonos t));
    begin
      perform public._plantilla_cuadricula_forma(v_conv, false);
      perform public._plantilla_cuadricula_nodos(v_conv, r.def, r.diseno, r.visibilidad, null);
    exception when sqlstate '22023' then
      raise exception 'la conversión de la plantilla de % no valida: % @ %', r.clave, sqlerrm, (select 1);
    end;
    if r.clave = 'subasta_usa' and (jsonb_array_length(v_conv -> 'columnas') <> 6 or not exists (select 1 from jsonb_array_elements(v_conv -> 'filas') f where f ->> 'id' = 'titulo')) then
      raise exception 'subasta_usa: esperaba sus seis columnas y la fila del título: %', v_conv -> 'columnas';
    end if;
  end loop;
  if v_n < 3 then raise exception 'sólo % orígenes con plantilla y fórmula v1', v_n; end if;
end $$;
rollback;

-- @test plantilla-convertir T3: los ids son deterministas y caben en la forma de un id: un nodo de 41 caracteres va con el hash FNV-1a (el mismo que TS)
begin;
do $$
declare v_def jsonb; v_pla jsonb; v_a jsonb; v_b jsonb; v_largo text := repeat('a', 41);
begin
  if public._plantilla_id_derivado('n_' || repeat('a', 39)) <> 'n_' || repeat('a', 39) then raise exception 'un id de 41 no se queda igual'; end if;
  if public._plantilla_id_derivado('n_' || v_largo) <> 'n_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_6313f1d9' then
    raise exception 'el hash de un id largo no es el de TS: %', public._plantilla_id_derivado('n_' || v_largo);
  end if;
  if public._plantilla_id_derivado('c_n_' || v_largo || '_concepto') <> 'c_n_aaaaaaaaaaaaaaaaaaaaaaaaaaaa_d18778b9' then
    raise exception 'el hash de una celda larga no es el de TS: %', public._plantilla_id_derivado('c_n_' || v_largo || '_concepto');
  end if;
  v_def := jsonb_build_object('nodos', jsonb_build_array(jsonb_build_object('id', v_largo, 'tipo', 'input', 'etiqueta', 'Largo', 'grupo', 'g1'),
                                                         jsonb_build_object('id', 'total', 'tipo', 'calculo', 'etiqueta', 'Total', 'salida', 'total')),
                              'grupos', '[{"id": "g1", "etiqueta": "Uno"}]'::jsonb);
  v_pla := '{"grupos": [{"grupo": "g1"}], "total": {"etiqueta": "Total"}, "logo": true, "columnas": {"leyenda": true, "tipo_cambio": true, "plazo": true}}';
  v_a := public._plantilla_convertir(v_pla, v_def, null, null, '{}');
  v_b := public._plantilla_convertir(v_pla, v_def, null, null, '{}');
  if v_a is distinct from v_b then raise exception 'dos conversiones de lo mismo no dan lo mismo'; end if;
  if exists (select 1 from jsonb_array_elements(v_a -> 'filas') f where (f ->> 'id') !~ '^[a-z][a-z0-9_]{0,40}$')
     or exists (select 1 from jsonb_array_elements(v_a -> 'celdas') c where (c ->> 'id') !~ '^[a-z][a-z0-9_]{0,40}$') then
    raise exception 'un id de la conversión no tiene la forma de un id';
  end if;
  perform public._plantilla_cuadricula_forma(v_a, false);
end $$;
rollback;

-- @test plantilla-convertir T4: la conversión y sus ayudantes son sólo de service_role (la llama cotizacion_tarjeta, definer): authenticated no la ejecuta y no entra al inventario de lo oculto
begin;
do $$
declare v_f text;
begin
  foreach v_f in array array['public._plantilla_convertir(jsonb, jsonb, jsonb, jsonb, text[])', 'public._plantilla_conversion_fila(jsonb, jsonb, text, jsonb, text)',
                             'public._plantilla_pieza(text, text, integer, jsonb, jsonb, text, integer)', 'public._plantilla_id_derivado(text)',
                             'public._plantilla_alto_de_texto(text, integer, integer, integer)'] loop
    if not has_function_privilege('service_role', v_f, 'execute') or has_function_privilege('authenticated', v_f, 'execute')
       or has_function_privilege('anon', v_f, 'execute') or has_function_privilege('public', v_f, 'execute') then
      raise exception 'privilegios de %', v_f;
    end if;
    if (select prosecdef from pg_proc where oid = v_f::regprocedure) then raise exception '% corre con los derechos de su dueña', v_f; end if;
  end loop;
end $$;
rollback;
