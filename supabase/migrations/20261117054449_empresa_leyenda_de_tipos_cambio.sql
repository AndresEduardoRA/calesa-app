-- La leyenda de los tipos de cambio: el texto que la empresa pone al pie de lo que se comparte con un cliente («Valores referenciales»).
-- Vive en la fila única de `ajustes_empresa` (la lee toda cuenta con sesión por el `select` de tabla) y se escribe sólo por RPC, con
-- `empresa.tipos_cambio.gestionar` y la versión de la fila (PT409). Vacía = sin leyenda.

alter table public.ajustes_empresa
  add column leyenda_tipos_cambio text
  constraint ajustes_empresa_leyenda_tipos_cambio_check
  check (leyenda_tipos_cambio is null or (leyenda_tipos_cambio = btrim(leyenda_tipos_cambio) and char_length(leyenda_tipos_cambio) between 1 and 120));

comment on column public.ajustes_empresa.leyenda_tipos_cambio is
  'Lo que se lee al pie de los tipos de cambio compartidos con un cliente (imagen y texto): 1 a 120 caracteres, sin saltos de línea; null = sin leyenda. La escribe empresa_guardar_leyenda_de_tipos_cambio().';

create function public.empresa_guardar_leyenda_de_tipos_cambio(p_leyenda text, p_actualizado_en_esperado timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.ajustes_empresa;
  v_leyenda text := nullif(btrim(p_leyenda), '');
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  if v_leyenda is not null and v_leyenda ~ '[[:cntrl:]]' then
    raise exception 'La leyenda va en una sola línea.' using errcode = '22023', hint = 'leyenda';
  end if;
  if v_leyenda is not null and char_length(v_leyenda) > 120 then
    raise exception 'La leyenda admite hasta 120 caracteres.' using errcode = '22023', hint = 'leyenda';
  end if;

  select * into v from public.ajustes_empresa e where e.id = 1 for update;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la empresa mientras los editabas.');

  update public.ajustes_empresa e
     set leyenda_tipos_cambio = v_leyenda,
         actualizado_por = (select auth.uid())
   where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;

comment on function public.empresa_guardar_leyenda_de_tipos_cambio(text, timestamptz) is
  'Guarda la leyenda de los tipos de cambio compartidos (empresa.tipos_cambio.gestionar; vacía la quita). Misma versión de la fila que empresa_guardar_ajustes: PT409 si cambió; 22023 con hint leyenda si pasa de 120 caracteres o lleva saltos de línea.';

revoke all on function public.empresa_guardar_leyenda_de_tipos_cambio(text, timestamptz) from public, anon, authenticated;
grant execute on function public.empresa_guardar_leyenda_de_tipos_cambio(text, timestamptz) to authenticated, service_role;
