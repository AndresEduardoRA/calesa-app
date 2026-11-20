import { completoCon, nacional } from './leads-ficha-telefonos'
import { idDe, marcarInteres, vincular } from './leads'
import { nuevoLead } from './leads-ficha'
import { limpiarListado, type TerrenoDelListado } from './leads-listado'
import { embudoPorDefecto, etapa, oportunidadesPorSql } from './leads-oportunidades'
import { otorgarComo } from './leads-portal'
import { literal, sql } from './sql'

// Un lead de la dueña con todo (los nombres y vehículos llevan `marca`, que cada spec elige para limpiar sólo lo suyo), para los e2e de la ficha en dos columnas (`leads-ficha-dos-columnas.spec.ts`,
// `leads-ficha-desplazamiento-interno.spec.ts`): seguimientos, recordatorios, oportunidades, vehículos y el portal otorgado.

const ORIGEN = "(select id from public.origenes where clave = 'subasta_usa')"

// Seguimientos de la dueña con un detalle de verdad (cada 30 minutos hacia atrás), recordatorios pendientes (la mitad vencidos) y
// oportunidades, por SQL: con 10 o con 1.000, el documento de la ficha pesa lo mismo (lo que crece va por «Ver todos» o «Ver más»).
async function sembrar(t: TerrenoDelListado, leadId: string, cuantos: number): Promise<void> {
  const duena = await idDe(t.personas.duena)
  const lead = literal(leadId)
  const persona = literal(duena)
  sql(`
    begin;
    set local session_replication_role = replica;
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en)
    select ${lead}, ${persona},
           (select id from public.tipos_seguimiento where activo order by orden limit 1),
           'Llamada ' || g,
           jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph',
             'content', jsonb_build_array(jsonb_build_object('type', 'text',
               'text', 'Habló del vehículo, pidió el precio puesto en La Paz y quedó en volver a llamar el jueves, nota ' || g))))),
           'Habló del vehículo, pidió el precio puesto en La Paz y quedó en volver a llamar el jueves, nota ' || g,
           now() - make_interval(mins => g * 30)
      from generate_series(1, ${String(cuantos)}) g;
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    select ${persona}, ${lead}, 'Mandarle la cotización ' || g,
           case when g % 2 = 0 then now() - make_interval(hours => g) else now() + make_interval(hours => g) end
      from generate_series(1, ${String(cuantos)}) g;
    set local session_replication_role = origin;
    update public.leads set ultimo_seguimiento_en = now() - interval '30 minutes' where id = ${lead};
    commit;
  `)
  const embudo = await embudoPorDefecto(t.personas.duena)
  oportunidadesPorSql({
    usuarioId: duena,
    leadId,
    embudoId: embudo.id,
    etapaAbierta: etapa(embudo, 'Nuevo'),
    etapaCerrada: etapa(embudo, 'Ganado'),
    abiertas: Math.ceil(cuantos * 0.6),
    cerradas: Math.floor(cuantos * 0.4),
  })
}

// Un vehículo vinculado y cuatro interesados de la subasta de la semilla.
async function conVehiculos(
  t: TerrenoDelListado,
  marca: string,
  leadId: string,
  corto: string,
): Promise<void> {
  const titulos = [0, 1, 2, 3, 4].map((n) => `${marca} ${corto} ${String(n)}`)
  sql(
    `insert into public.vehiculos (origen_id, titulo) select ${ORIGEN}, unnest(array[${titulos.map(literal).join(', ')}])`,
  )
  const ids = sql(
    `select id from public.vehiculos where titulo like ${literal(`${marca} ${corto} %`)} order by titulo`,
  ).split('\n')
  const [vinculado, ...interesados] = ids
  await vincular(vinculado ?? '', leadId)
  for (const vehiculoId of interesados) {
    await marcarInteres({
      vehiculoId,
      leadId,
      quien: t.personas.duena,
      nota: 'Lo quiere en blanco',
    })
  }
}

// Un lead de la dueña con todo: seguimientos, recordatorios, oportunidades, vehículos y el portal otorgado.
export async function leadCompleto(
  t: TerrenoDelListado,
  marca: string,
  corto: string,
  cuantos: number,
) {
  const lead = await nuevoLead({
    corto: `${marca} ${corto}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
  })
  await sembrar(t, lead.id, cuantos)
  await conVehiculos(t, marca, lead.id, corto)
  await otorgarComo(t.personas.duena, lead.id, 'clave-de-la-prueba-1')
  return lead
}

// Borra lo que sembró `leadCompleto()` y el terreno del listado.
export async function limpiarLeadsCompletos(t: TerrenoDelListado, marca: string): Promise<void> {
  sql(`
    begin;
    create temporary table de_la_prueba on commit drop as
      select id from public.leads where nombre like ${literal(`%${marca}%`)};
    set local session_replication_role = replica;
    delete from public.seguimientos where lead_id in (select id from de_la_prueba);
    delete from public.recordatorios where lead_id in (select id from de_la_prueba);
    delete from public.oportunidades where lead_id in (select id from de_la_prueba);
    delete from public.vehiculos_interesados where lead_id in (select id from de_la_prueba);
    delete from public.vehiculos_vinculos where lead_id in (select id from de_la_prueba);
    set local session_replication_role = origin;
    delete from public.vehiculos where titulo like ${literal(`${marca}%`)};
    commit;
  `)
  await limpiarListado(t)
}
