// Lo que siembra `e2e/leads-ficha-derecha.spec.ts` en la base LOCAL: seguimientos, recordatorios, embudos con una abierta cada uno, cerradas y
// vehículos de un lead, como si la dueña los hubiera cargado.
import { idDePersona } from './cotizaciones-sembradas'
import { exigir, marcarInteres, vincular } from './leads'
import { rpcComo } from './leads-cartera'
import { literal, sql } from './sql'

// Una oportunidad por SQL en la etapa inicial (abierta) o ganada (cerrada) de un embudo; cada una más nueva que la anterior.
export function oportunidadEn(
  duena: string,
  leadId: string,
  embudoId: string,
  { titulo, cerrada = false }: { titulo: string; cerrada?: boolean },
): void {
  const condicion = cerrada ? 'es_ganada' : 'es_inicial'
  sql(`insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda, monto_estimado)
    select ${literal(leadId)}, ${literal(idDePersona(duena))}, ${literal(embudoId)}, id, ${literal(titulo)}, 'USD', 18500
      from public.embudos_etapas where embudo_id = ${literal(embudoId)} and ${condicion} order by orden limit 1`)
}

// Otro embudo de la persona (por su RPC, como en la app).
export async function otroEmbudo(email: string, nombre: string): Promise<string> {
  const { data, error } = await rpcComo(email, 'embudo_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre,
  })
  exigir(error, `crear el embudo ${nombre}`)
  return (data as { embudo: { id: string } }).embudo.id
}

// Diez seguimientos de la dueña (de tres tipos) y seis recordatorios: el más próximo, vencido («Confirmar la visita»).
export function seguimientosYRecordatorios(duena: string, leadId: string): void {
  const persona = literal(idDePersona(duena))
  const l = literal(leadId)
  sql(`
    begin;
    set local session_replication_role = replica;
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto, ocurrido_en)
    select ${l}, ${persona},
           (select id from public.tipos_seguimiento where activo order by orden offset (g % 3) limit 1),
           'Llamada ' || g, 'Pidió el precio puesto en La Paz y quedó en volver a llamar, nota ' || g,
           now() - make_interval(mins => g * 30)
      from generate_series(1, 10) g;
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    select ${persona}, ${l}, case when g = 1 then 'Confirmar la visita' else 'Mandarle la cotización ' || g end,
           case when g = 1 then now() - interval '2 hours' else now() + make_interval(days => g) end
      from generate_series(1, 6) g;
    set local session_replication_role = origin;
    update public.leads set ultimo_seguimiento_en = now() - interval '30 minutes' where id = ${l};
    commit;
  `)
}

// Un vehículo vinculado, uno interesado y un vínculo anterior (vinculado y desvinculado), con títulos `<marca> <n>`.
export async function vehiculosDelLead(
  duena: string,
  leadId: string,
  { origenId, marca }: { origenId: string; marca: string },
): Promise<void> {
  const titulos = [0, 1, 2].map((n) => `${marca} ${String(n)}`)
  sql(
    `insert into public.vehiculos (origen_id, titulo) select ${literal(origenId)}, unnest(array[${titulos.map(literal).join(', ')}])`,
  )
  const [anterior, vinculado, interesado] = sql(
    `select id from public.vehiculos where titulo like ${literal(`${marca} %`)} order by titulo`,
  ).split('\n')
  await vincular(anterior ?? '', leadId)
  await vincular(anterior ?? '', null)
  await vincular(vinculado ?? '', leadId)
  await marcarInteres({ vehiculoId: interesado ?? '', leadId, quien: duena, nota: 'En blanco' })
}
