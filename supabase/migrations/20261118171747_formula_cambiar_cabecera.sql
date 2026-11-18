-- El ⚙ de la cabecera (docs/COTIZADOR.md › «Versiones»; docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»): publica la N+1 desde la publicada
-- con el modo por defecto, «Ver total» por defecto y los modos visibles que se eligieron, sin tocar el borrador. El mismo contrato que el ⚙ de una
-- constante (`formula_cambiar_constante`): el permiso antes que todo, la esperada (PT409 con quién y cuándo), los mismos valores (22023) y
-- `_publicar_version()`, que toma el candado `formulas:<origen>`, vuelve a comparar la esperada, valida el diseño entero y registra `formula.publicada`.
-- Escribe siempre las tres claves; «los mismos valores» se mira sobre los efectivos (lo que falta vale el primer modo, falso y todos).

create or replace function public.formula_cambiar_cabecera(
  p_origen uuid,
  p_modo_por_defecto text,
  p_ver_total_bs_por_defecto boolean,
  p_modos_visibles text[],
  p_publicada_esperada uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pub public.formulas;
  v_cab jsonb;
  v_modos jsonb;
  v_f text;
  v_modo text;
  v_ver boolean;
  v_visibles jsonb;
  v_pedido jsonb;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_modo_por_defecto is null then
    raise exception 'Elige el modo por defecto.' using errcode = '22023', hint = 'modo_por_defecto';
  end if;
  if p_ver_total_bs_por_defecto is null then
    raise exception 'Di si el total en moneda local sale por defecto.' using errcode = '22023', hint = 'ver_total_bs_por_defecto';
  end if;
  if p_modos_visibles is null then
    raise exception 'Elige las opciones visibles.' using errcode = '22023', hint = 'modos_visibles';
  end if;
  select * into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  -- Se compara con lo leído aquí, que es lo que se copia: `_publicar_version` vuelve a comparar tras el candado.
  if p_publicada_esperada is not null and p_publicada_esperada is distinct from v_pub.id then
    v_f := public._version_publicada_por(v_pub.id);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  v_cab := coalesce(v_pub.diseno -> 'cabecera', '{}'::jsonb);
  v_modos := coalesce(v_cab -> 'modos', '[]'::jsonb);
  if jsonb_array_length(v_modos) = 0 then
    raise exception 'Esta fórmula no tiene modos de tipo de cambio.' using errcode = '22023', hint = 'cabecera';
  end if;
  -- Los valores efectivos de la publicada.
  v_modo := coalesce(v_cab ->> 'modo_por_defecto', v_modos -> 0 ->> 'clave');
  v_ver := coalesce((v_cab ->> 'ver_total_bs_por_defecto')::boolean, false);
  v_visibles := coalesce(v_cab -> 'modos_visibles',
                         (select jsonb_agg(m.valor ->> 'clave' order by m.o) from jsonb_array_elements(v_modos) with ordinality m (valor, o)));
  v_pedido := jsonb_build_object('modo_por_defecto', p_modo_por_defecto, 'ver_total_bs_por_defecto', p_ver_total_bs_por_defecto,
                                 'modos_visibles', to_jsonb(p_modos_visibles));
  if v_modo = p_modo_por_defecto and v_ver = p_ver_total_bs_por_defecto and v_visibles = to_jsonb(p_modos_visibles) then
    raise exception 'La cabecera ya tiene esos valores.' using errcode = '22023', hint = 'cabecera';
  end if;
  return public._publicar_version(p_origen, v_pub.definicion, v_pub.params,
                                  jsonb_set(v_pub.diseno, '{cabecera}', (v_cab - array['modo_por_defecto', 'ver_total_bs_por_defecto', 'modos_visibles']) || v_pedido),
                                  format('Cabecera: %s por defecto, desde el cotizador', p_modo_por_defecto), v_pub.id,
                                  jsonb_build_object('cabecera', v_pedido), true);
end $$;

revoke all on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid) from public, anon;
grant execute on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid) to authenticated, service_role;

comment on function public.formula_cambiar_cabecera(uuid, text, boolean, text[], uuid) is 'El ⚙ de la cabecera: publica la N+1 desde la publicada con el modo por defecto, «Ver total» por defecto y los modos visibles, sin tocar el borrador (cotizaciones.configurar del origen). PT409 si la esperada no es la publicada (quién y cuándo); 22023 con hint cabecera si la publicada no tiene modos o ya tiene esos valores (los efectivos); el diseño resultante se valida entero (validar_diseno) y se registra formula.publicada con despues.cabecera. docs/COTIZADOR.md › «Versiones».';
