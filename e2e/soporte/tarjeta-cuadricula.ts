// Lo que prepara `e2e/cotizar-tarjeta-cuadricula.spec.ts` (T310): orígenes propios con una copia de la fórmula v1 de `subasta_usa` (nunca se publica sobre la
// de la semilla, que leen otros specs), publicar una plantilla como la dueña, la N+1 con un nodo en «costos» y el color del catálogo como lo da el navegador.
// Sólo para las pruebas.
import { CONTRASENA } from './alta'
import { clienteComo } from './cotizar-guardada'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './origenes'
import { literal, sql } from './sql'
import { cargarVehiculos, vehiculoPorTitulo } from './vehiculos'

const RAIZ = 'tjcuad_'

export const subasta = () => sql("select id from public.origenes where clave = 'subasta_usa'")

// La fórmula v1 de la subasta (definición, constantes, diseño y visibilidad) y sus tablas de referencia, copiadas en el origen.
export function copiarLaFormulaDeLaSubasta(origenId: string): void {
  const o = literal(origenId)
  const s = literal(subasta())
  sql(`
    insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota, publicado_en)
    select ${o}::uuid, 'publicada', 1, f.definicion, f.params, f.diseno, f.visibilidad, 'E2E T310', now()
      from public.formulas f where f.origen_id = ${s}::uuid and f.version = 1;
    insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
    select ${o}::uuid, t.clave, t.nombre, t.columnas from public.tablas_referencia t where t.origen_id = ${s}::uuid;
    insert into public.tablas_referencia_filas (tabla_id, valores, orden)
    select n.id, f.valores, f.orden
      from public.tablas_referencia_filas f
      join public.tablas_referencia t on t.id = f.tabla_id and t.origen_id = ${s}::uuid
      join public.tablas_referencia n on n.clave = t.clave and n.origen_id = ${o}::uuid;`)
}

// Publica una plantilla por el camino de siempre, como la dueña: guardar el borrador y publicarlo.
export async function publicarComoLaDuena(
  duena: string,
  origenId: string,
  definicion: unknown,
): Promise<void> {
  const cliente = await clienteComo({ email: duena, contrasena: CONTRASENA })
  const guardado = await cliente.rpc('plantilla_guardar_borrador', {
    p_origen: origenId,
    p_actualizado_en_esperado: null as unknown as string,
    p_def: definicion as never,
  })
  if (guardado.error) throw new Error(`No se guardó la plantilla: ${guardado.error.message}`)
  const publicado = await cliente.rpc('plantilla_publicar', {
    p_origen: origenId,
    p_actualizado_en_esperado: guardado.data as string,
    p_nota: 'E2E T310',
  })
  if (publicado.error) throw new Error(`No se publicó la plantilla: ${publicado.error.message}`)
}

// La N+1 de la fórmula del origen con la comisión en una sección de «costos»: deja de ser del nivel «todos».
export function publicarConLaComisionEnCostos(origenId: string): void {
  sql(`
    do $f$
    declare v1 public.formulas; v_secciones jsonb; v_diseno jsonb;
    begin
      select * into v1 from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada';
      v_secciones := (select jsonb_agg(case when s ->> 'id' = 'logistica'
                                            then jsonb_set(s, '{items}', (select jsonb_agg(i order by n) from jsonb_array_elements(s -> 'items') with ordinality x (i, n)
                                                                          where i ->> 'nodo' is distinct from 'comision'))
                                            else s end order by o)
                        from jsonb_array_elements(v1.diseno -> 'secciones') with ordinality y (s, o))
                  || jsonb_build_array(jsonb_build_object('id', 'restringida', 'titulo', 'Restringida', 'presentacion', 'principal', 'nivel_ver', 'costos',
                                                          'nivel_editar', 'costos', 'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'comision', 'ancho', 'completo'))));
      v_diseno := jsonb_set(v1.diseno, '{secciones}', v_secciones);
      update public.formulas set estado = 'archivada' where id = v1.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v1.origen_id, v1.version + 1, 'publicada', v1.definicion, v1.params, v_diseno,
              public._preparar_publicacion(v1.definicion, v1.params, v_diseno, false), 'E2E T310 N+1', now());
    end $f$`)
}

export function borrarLoDeEsteSpec(): void {
  const mios = `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`
  sql(`
    delete from public.cotizaciones where origen_id in (${mios});
    delete from public.vehiculos where origen_id in (${mios});
    delete from public.origenes where id in (${mios})`)
}

export async function crearOrigen(proyecto: string, resto: string): Promise<string> {
  const origen = await crearOrigenDePrueba(
    `E2E tarjeta ${resto} ${proyecto}`,
    `${RAIZ}${resto}_${proyecto}`,
    { tipo: 'subasta' },
  )
  copiarLaFormulaDeLaSubasta(origen.id)
  return origen.id
}

export async function crearVehiculo(origenId: string, titulo: string): Promise<string> {
  await cargarVehiculos(origenId, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  return (await vehiculoPorTitulo(titulo))?.id ?? ''
}

export const urlDeLaHoja = (origenId: string, lead: string, vehiculo?: string) =>
  `/cotizaciones/nuevo?origen=${origenId}&lead=${lead}${vehiculo ? `&vehiculo=${vehiculo}` : ''}`

// El color del catálogo como lo da `getComputedStyle`.
export function rgbDe(clave: string): string {
  const hex = sql(`select hex from public.tonos where clave = ${literal(clave)}`)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`
}
