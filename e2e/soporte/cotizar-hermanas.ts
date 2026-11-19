// Lo que preparan los e2e de las cotizaciones hermanas (glosario: «Cotizaciones hermanas» y «Variante en par»): un origen propio con una fórmula publicada por el
// camino de verdad (`_preparar_publicacion()`) cuya variante `contenedor` («20 pies» y «40 pies») se cotiza en par, un `precio` común (constante) y un `transporte`
// que lee una tabla congelada por el contenedor (cambia según la opción); el total los suma. Y una dueña, un lead y un vehículo. Todo con el proyecto en la clave.
import { expect, type Locator, type Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './cotizar-formula'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { telefonoAlAzar } from './leads-alta'
import { borrarLotesDePrueba } from './papelera'
import { literal, sql } from './sql'

export const PRECIO = 10000
export const TRANSPORTE = { c20: 1500, c40: 2400 } as const

const MODO = {
  clave: 'm1',
  nombre: 'Modo uno',
  total_en: 'tc',
  buckets: [{ bucket: 'origen', nodo: 'tc' }],
}

function definicionEnPar() {
  return {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
      {
        id: 'contenedor',
        tipo: 'opcion',
        etiqueta: 'Contenedor',
        opciones: [
          { clave: 'c20', etiqueta: '20 pies', titulo: '1 vehículo en un contenedor de 20 pies' },
          { clave: 'c40', etiqueta: '40 pies', titulo: '2 vehículos en un contenedor de 40 pies' },
        ],
        en_par: true,
      },
      { id: 'precio', tipo: 'constante', etiqueta: 'Precio', bucket: 'origen' },
      {
        id: 'transporte',
        tipo: 'tabla',
        etiqueta: 'Transporte',
        tabla: 'e2e_transporte_par',
        match: { contenedor: 'contenedor' },
        columna: 'monto',
        sobrescribible: true,
        bucket: 'origen',
      },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        de: ['precio', 'transporte'],
        etiqueta: 'Total',
        salida: 'total',
        bucket: 'origen',
      },
    ],
    buckets: { origen: 'tc' },
    total_en: 'tc',
  }
}

function formulaEnPar() {
  return {
    definicion: definicionEnPar(),
    params: {
      precio: PRECIO,
      tablas: {
        e2e_transporte_par: [
          { contenedor: 'c20', monto: TRANSPORTE.c20 },
          { contenedor: 'c40', monto: TRANSPORTE.c40 },
        ],
      },
    },
    diseno: {
      cabecera: { ver_total_bs: false, modos: [MODO] },
      secciones: [
        {
          id: 'datos',
          titulo: 'Datos',
          presentacion: 'principal',
          items: [
            { tipo: 'variante', nodo: 'contenedor' },
            { tipo: 'celda', nodo: 'precio', ancho: 'mitad' },
            { tipo: 'celda', nodo: 'transporte', ancho: 'mitad' },
            { tipo: 'subtotal', nodo: 'total' },
          ],
        },
      ],
      tarjeta_total: { nodo: 'total', secundarios: [] },
    },
  }
}

export function publicarFormulaEnPar(origenId: string): void {
  const { definicion, params, diseno } = formulaEnPar()
  const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(diseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E hermanas', now());
    end $f$`)
}

export async function prepararHermanas(proyecto: string): Promise<{
  origen: { id: string; nombre: string }
  duena: string
  lead: string
  vehiculo: string
}> {
  await limpiarHermanas()
  const origen = await crearOrigenDeCotizar(proyecto, 'herm', false)
  publicarFormulaEnPar(origen.id)
  const duena = correoDePrueba(`duena-hermanas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Hebe Hermanas' })
  const lead = await crearLead({
    nombre: `hermanas ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  const vehiculo = sql(
    `insert into public.vehiculos (origen_id, titulo, marca) values (${literal(origen.id)}::uuid, 'E2E Hilux 2020', 'toyota') returning id`,
  )
  return { origen, duena, lead, vehiculo }
}

// Las cotizaciones primero (retienen el lote), después los lotes de la papelera (una persona no se borra mientras un lote la nombra), los leads y las personas.
export async function limpiarHermanas(): Promise<void> {
  borrarOrigenesDeCotizar()
  await borrarLotesDePrueba()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
}

// La celda de un nodo en una columna del par (`data-nodo` y `data-opcion`). Sólo lo visible: la pantalla de antes queda montada y oculta al navegar.
export const celdaEnPar = (page: Page, nodo: string, opcion: string): Locator =>
  page.locator(`[data-nodo="${nodo}"][data-opcion="${opcion}"]:visible`)
export const totalDe = (page: Page, opcion: string): Locator =>
  page.locator(`[data-total][data-opcion="${opcion}"]:visible`)

// Abre una celda y escribe un valor confirmado con Enter (la celda abre recién con la página hidratada: se insiste hasta que abre).
export async function tipearEn(celda: Locator, texto: string): Promise<void> {
  const entrada = celda.locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) await celda.locator('[data-parada="0"]').click()
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

export type HermanaEnLaBase = {
  id: string
  hermana: string | null
  titulo: string
  opcion: string
  version: string
  eliminada: boolean
  lote: string | null
  clase: string
}

// Las cotizaciones del origen, de la más vieja a la más nueva.
export function hermanasDe(origenId: string): HermanaEnLaBase[] {
  const texto = sql(`
    select coalesce(json_agg(json_build_object('id', id, 'hermana', hermana_id, 'titulo', titulo, 'opcion', valores ->> 'contenedor',
                                               'version', actualizado_en::text, 'eliminada', eliminado_en is not null,
                                               'lote', lote_papelera_id, 'clase', clase) order by creado_en, id), '[]')::text
      from public.cotizaciones where origen_id = ${literal(origenId)}::uuid`)
  return JSON.parse(texto) as HermanaEnLaBase[]
}
