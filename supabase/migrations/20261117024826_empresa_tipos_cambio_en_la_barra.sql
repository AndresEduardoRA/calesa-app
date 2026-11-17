-- Los tipos de cambio que la empresa pone a la vista en la barra superior («En la barra»), y el último cambio de valor de cada uno para el
-- popover de la barra.
--
-- 1. `tipos_cambio.en_la_barra`: hasta 3 activos marcados (TOPE_EN_LA_BARRA en `entities/tipos-cambio.ts`). Un inactivo marcado no se ve ni
--    cuenta para el tope; sin ninguno marcado, la barra muestra el por defecto. Nace marcado el que la barra muestra hoy: nada cambia al
--    desplegar.
-- 2. `tipo_cambio_guardar(…, p_en_la_barra)`: un solo «Guardar» y una sola versión por fila (el panel de Configuración). Marcar toma un
--    candado consultivo de la barra antes que la fila: dos personas que suman uno a la vez no pasan de 3, y el desmarcado del por defecto
--    (que bloquea otra fila) no arma un 40P01.
-- 3. `tipos_cambio_vigentes()`: los activos con su versión y el último cambio del valor (del historial: renombrar o marcar no lo mueve) con el
--    nombre de quien lo hizo, nunca el correo. Lo lee toda persona activa al abrir el popover; el historial entero sigue siendo de quien gestiona.

-- 1. La columna. Sin índice: es un catálogo de decenas que se lee entero (`getTodos`). Sin policy nueva: el `select` de tabla de
--    `authenticated` ya la cubre.
alter table public.tipos_cambio add column en_la_barra boolean not null default false;

comment on column public.tipos_cambio.en_la_barra is
  'A la vista en la barra superior (hasta 3 activos; sin ninguno, el por defecto). Se escribe por tipo_cambio_guardar(p_en_la_barra).';

-- Lo que la barra muestra hoy: el primer activo, con el por defecto adelante (`vigentes()` sobre `getTodos`, por orden y nombre).
update public.tipos_cambio set en_la_barra = true
where id = (select t.id from public.tipos_cambio t where t.activo order by t.es_default desc, t.orden, t.nombre limit 1);

-- 2. Guardar con «En la barra». El parámetro nuevo va al final y con default: las llamadas de siempre (con nombre) siguen igual.
drop function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean);

create function public.tipo_cambio_guardar(
  p_id uuid,
  p_actualizado_en_esperado timestamptz,
  p_nombre text default null,
  p_valor numeric default null,
  p_activo boolean default null,
  p_es_default boolean default null,
  p_en_la_barra boolean default null
) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tipos_cambio;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  -- El candado de la barra antes que la fila: con la fila primero, quien marca y desmarca el por defecto de otra fila del mismo par
  -- esperaría a quien ya tiene el candado y espera esa fila (40P01).
  if p_en_la_barra then
    perform pg_advisory_xact_lock(hashtextextended('tipos_cambio:en_la_barra', 0));
  end if;
  select * into v from public.tipos_cambio t where t.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de cambio ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de cambio mientras lo editabas.');
  if p_valor is not null and (p_valor = 'NaN'::numeric or p_valor <= 0) then
    raise exception 'El valor tiene que ser mayor que cero.';
  end if;
  if v.es_default and p_es_default = false then
    raise exception 'Siempre hay un tipo de cambio por defecto entre dos monedas: marca otro para cambiarlo.';
  end if;
  if coalesce(p_es_default, v.es_default) and not coalesce(p_activo, v.activo) then
    raise exception 'El tipo de cambio por defecto no se desactiva: marca otro por defecto antes.';
  end if;
  if p_activo and not v.activo
     and (select count(*) from public.monedas m where m.activa and m.codigo in (v.moneda_de, v.moneda_a)) <> 2 then
    raise exception 'Para activarlo, las dos monedas tienen que estar activas.';
  end if;
  if p_en_la_barra and not v.en_la_barra then
    if not coalesce(p_activo, v.activo) then
      raise exception 'Para ponerlo en la barra superior, primero actívalo.' using errcode = '22023', hint = 'en_la_barra';
    end if;
    -- Una sentencia aparte, tras el candado: ve lo que confirmó quien lo tenía. El 3 es TOPE_EN_LA_BARRA (`entities/tipos-cambio.ts`).
    if (select count(*) from public.tipos_cambio t where t.en_la_barra and t.activo and t.id <> v.id) >= 3 then
      raise exception 'Ya hay 3 tipos de cambio en la barra superior: quita uno para sumar otro.' using errcode = '22023', hint = 'en_la_barra';
    end if;
  end if;
  if p_es_default and not v.es_default then
    update public.tipos_cambio t set es_default = false
    where t.moneda_de = v.moneda_de and t.moneda_a = v.moneda_a and t.es_default and t.id <> v.id;
  end if;
  update public.tipos_cambio t set
    nombre = coalesce(nullif(btrim(p_nombre), ''), t.nombre),
    valor = coalesce(p_valor, t.valor),
    activo = coalesce(p_activo, t.activo),
    es_default = coalesce(p_es_default, t.es_default),
    en_la_barra = coalesce(p_en_la_barra, t.en_la_barra)
  where t.id = v.id
  returning t.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

comment on function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean, boolean) is
  'Edita un tipo de cambio (lo que viene nulo no se toca) con empresa.tipos_cambio.gestionar y la versión esperada (PT409). Marcar «En la barra» exige activo y que haya menos de 3 activos marcados (22023, hint en_la_barra), tras el candado consultivo de la barra, tomado antes que la fila. Desactivar no desmarca.';

revoke all on function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean, boolean) to authenticated, service_role;

-- 3. Los vigentes con su último cambio de valor, para el popover de la barra.
create function public.tipos_cambio_vigentes()
returns table (
  id uuid,
  nombre text,
  moneda_de text,
  moneda_a text,
  valor numeric,
  actualizado_en timestamptz,
  actualizado_por text,
  valor_cambiado_en timestamptz,
  valor_cambiado_por text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.nombre, t.moneda_de::text, t.moneda_a::text, t.valor, t.actualizado_en,
         nullif(btrim(pa.nombre), ''),
         h.cambiado_en,
         nullif(btrim(ph.nombre), '')
    from public.tipos_cambio t
    left join public.perfiles pa on pa.id = t.actualizado_por
    left join lateral (
      -- tipos_cambio_historial_tipo_idx
      select x.cambiado_en, x.cambiado_por
        from public.tipos_cambio_historial x
       where x.tipo_cambio_id = t.id
       order by x.cambiado_en desc, x.id desc
       limit 1
    ) h on true
    left join public.perfiles ph on ph.id = h.cambiado_por
   where t.activo and (select public.es_usuario_activo())
   order by t.es_default desc, t.orden, t.nombre;
$$;

comment on function public.tipos_cambio_vigentes() is
  'Los tipos de cambio activos (el por defecto adelante) con su versión, el nombre de quien los tocó por última vez y el último cambio del valor (del historial, por tipos_cambio_historial_tipo_idx) con el nombre de quien lo hizo; nunca el correo, y un nombre vacío da null. Para toda persona activa (el popover de la barra superior); una cuenta no activa recibe 0 filas.';

revoke all on function public.tipos_cambio_vigentes() from public, anon, authenticated;
grant execute on function public.tipos_cambio_vigentes() to authenticated, service_role;
