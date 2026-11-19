import { expect, test, type Page } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  embudoPorDefecto,
  etapa,
  oportunidadesPorSql,
  titulosEnElOrdenDeLaBase,
} from './soporte/leads-oportunidades'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'

// El bloque «Oportunidades» de la ficha: dibuja hasta 3 abiertas, en el orden de la base, y «Ver todas» (el embudo filtrado por el lead) si
// hay algo que no se ve (T344). Lo que no se ve no viaja con el documento de la ficha. El resto del bloque va en `leads-oportunidades.spec.ts`
// y `leads-ficha-derecha.spec.ts`. Cada prueba crea su propio lead sobre el terreno de `beforeAll`: ninguna alimenta a otra. Las abiertas del
// mismo embudo entran por SQL (la guarda de una por embudo está en las RPC): sirven para medir el tope de lo que se dibuja.

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Un lead de Berta con `abiertas` y `cerradas` oportunidades,, y su ficha en «Oportunidades» como ella.
async function leadConOportunidades(
  page: Page,
  corto: string,
  { abiertas, cerradas = 0 }: { abiertas: number; cerradas?: number },
) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  if (abiertas + cerradas > 0) {
    const embudo = await embudoPorDefecto(t.personas.berta)
    oportunidadesPorSql({
      usuarioId: await idDe(t.personas.berta),
      leadId: lead.id,
      embudoId: embudo.id,
      etapaAbierta: etapa(embudo, 'Nuevo'),
      etapaCerrada: etapa(embudo, 'Ganado'),
      abiertas,
      cerradas,
    })
  }
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return lead
}

const filas = (page: Page) =>
  page.getByRole('list', { name: 'Oportunidades abiertas' }).getByRole('article')
const verTodas = (page: Page) =>
  page
    .getByRole('region', { name: 'Oportunidades', exact: true })
    .getByRole('link', { name: 'Ver todas' })
const titulosVisibles = (page: Page) => filas(page).evaluateAll((a) => a.map((x) => x.ariaLabel))

test('con 12 abiertas: se ven las primeras 3 en el orden de la base y «Ver todas» lleva al embudo filtrado por el lead', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `VerTodas ${info.project.name}`, { abiertas: 12 })
  const enLaBase = titulosEnElOrdenDeLaBase(lead.id)
  await expect(filas(page)).toHaveCount(3)
  expect(await titulosVisibles(page)).toEqual(enLaBase.slice(0, 3))
  const embudo = await embudoPorDefecto(t.personas.berta)
  await expect(verTodas(page)).toHaveAttribute(
    'href',
    `/leads?vista=embudo&embudo=${embudo.id}&lead=${lead.id}`,
  )
})

test('con 2 abiertas y nada más no hay nada que ver: sin «Ver todas»', async ({ page }, info) => {
  await leadConOportunidades(page, `Dos ${info.project.name}`, { abiertas: 2 })
  await expect(filas(page)).toHaveCount(2)
  await expect(verTodas(page)).toHaveCount(0)
})

test('con 1.000 (600 abiertas y 400 cerradas): el documento pesa lo de 10 y se dibujan 3', async ({
  page,
}, info) => {
  test.setTimeout(90_000)
  const lead = await leadConOportunidades(page, `Mil ${info.project.name}`, {
    abiertas: 600,
    cerradas: 400,
  })
  const conDiez = await leadConOportunidades(page, `MilDiez ${info.project.name}`, { abiertas: 10 })
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const documento = async (ruta: string) =>
    (await (await page.goto(ruta))?.body())?.toString() ?? ''
  const base = (await documento('/perfil')).length
  const deLaFicha = async (id: string) =>
    (await documento(`/leads/${id}?seccion=oportunidades`)).length - base
  const conMil = await deLaFicha(lead.id)
  const deDiez = await deLaFicha(conDiez.id)
  const resumen = `la ficha en «Oportunidades» aporta ${kb(deDiez)} KB con 10 y ${kb(conMil)} KB con 1.000`
  console.warn(`[oportunidades] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha con oportunidades', description: resumen })
  expect(conMil).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(conMil).toBeLessThanOrEqual(deDiez + 2 * 1024)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  await expect(filas(page)).toHaveCount(3)
  await expect(verTodas(page)).toBeVisible()
})
