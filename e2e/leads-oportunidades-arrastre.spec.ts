import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { esperarFichaHidratada, irAFicha, nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { capturar } from './soporte/recorrido'
import { enLaBase, etapa, embudoPorDefecto, oportunidad } from './soporte/leads-oportunidades'

// El embudo del lead en la ficha se mueve arrastrando una oportunidad a otra columna: con el mouse y con el teclado (Tab a la tarjeta, Espacio la
// toma, las flechas la llevan a la etapa de al lado, Espacio la suelta). Una perdida pregunta el motivo; si la base la rechaza, vuelve a su columna
// y avisa. El celular no arrastra: mueve con «Mover a» del «⋯» (`leads-oportunidades.spec.ts`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function irAlEmbudoDelLead(page: Page, corto: string, titulo: string) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  await esperarFichaHidratada(page)
  return { lead, op }
}

const bloque = (page: Page) => page.getByRole('region', { name: 'Oportunidades', exact: true })
const columna = (page: Page, nombre: string): Locator =>
  bloque(page).getByRole('region', { name: nombre, exact: true })
const tarjeta = (page: Page, titulo: string): Locator =>
  aLaVista(bloque(page).getByRole('article', { name: titulo }))

// Con el mouse: tomar la tarjeta y pasar por encima de la columna de destino (`hover` la trae a la vista si la fila hay que desplazarla; el segundo paso
// da al arrastre el movimiento que necesita para ver sobre qué columna está), y soltar.
async function arrastrarA(page: Page, titulo: string, destino: string) {
  await tarjeta(page, titulo).hover({ position: { x: 20, y: 10 } })
  await page.mouse.down()
  const meta = columna(page, destino)
  await meta.hover({ position: { x: 40, y: 40 } })
  await meta.hover({ position: { x: 44, y: 42 } })
  await page.mouse.up()
}

// @sin-celular: el celular no arrastra: mueve con «Mover a» del «⋯», que cubren leads-oportunidades.spec.ts y leads-mover-con-motivo.spec.ts
test('con el mouse: arrastrar la tarjeta a otra columna la mueve y queda en la base', async ({
  page,
}, info) => {
  const titulo = `Arrastre ${info.project.name}`
  const { op } = await irAlEmbudoDelLead(page, `Arr Mouse ${info.project.name}`, titulo)
  await expect(columna(page, 'Nuevo').getByRole('article', { name: titulo })).toBeVisible()
  await capturar(page, info, 'antes-de-arrastrar')
  await arrastrarA(page, titulo, 'Cotizado')
  await expect(columna(page, 'Cotizado').getByRole('article', { name: titulo })).toBeVisible()
  await expect(columna(page, 'Nuevo').getByRole('article')).toHaveCount(0)
  await capturar(page, info, 'despues-de-arrastrar')
  await expect.poll(async () => (await enLaBase(op.id))?.estado).toBe('abierta')
  const embudo = await embudoPorDefecto(t.personas.berta)
  await expect.poll(async () => (await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Cotizado'))
  // Soltarla donde estaba no pide nada ni la mueve.
  await arrastrarA(page, titulo, 'Cotizado')
  await expect(columna(page, 'Cotizado').getByRole('article', { name: titulo })).toBeVisible()
})

// @sin-celular: el celular no arrastra: mueve con «Mover a» del «⋯», que cubren leads-oportunidades.spec.ts y leads-mover-con-motivo.spec.ts
test('con el mouse: soltarla en «Perdido» pide el motivo con su URL y mueve al confirmar', async ({
  page,
}, info) => {
  const titulo = `Arrastre perdida ${info.project.name}`
  const { op } = await irAlEmbudoDelLead(page, `Arr Perdida ${info.project.name}`, titulo)
  await arrastrarA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await expect(dialogo).toBeVisible()
  await expect(page).toHaveURL(/panel=mover-oportunidad&oportunidad=/)
  // Hasta confirmar sigue en su columna.
  // (con el modal abierto el resto de la página queda oculta para los roles: se mira con `includeHidden`)
  await expect(
    page
      .getByRole('region', { name: 'Oportunidades', exact: true, includeHidden: true })
      .getByRole('region', { name: 'Nuevo', exact: true, includeHidden: true })
      .getByRole('article', { name: titulo, includeHidden: true }),
  ).toHaveCount(1)
  await dialogo.getByLabel('Motivo (opcional)').fill('Compró en otro lado')
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(dialogo).toBeHidden()
  await expect(columna(page, 'Perdido').getByRole('article', { name: titulo })).toBeVisible()
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'perdida', motivo_perdida: 'Compró en otro lado' })
})

// @sin-celular: el celular no arrastra: mueve con «Mover a» del «⋯», que cubren leads-oportunidades.spec.ts y leads-mover-con-motivo.spec.ts
test('con el teclado: Espacio toma la tarjeta, la flecha la lleva a la etapa de al lado y Espacio la suelta', async ({
  page,
}, info) => {
  const titulo = `Teclado ${info.project.name}`
  const { op } = await irAlEmbudoDelLead(page, `Arr Teclado ${info.project.name}`, titulo)
  await tarjeta(page, titulo).focus()
  await page.keyboard.press('Space')
  // Se anuncia en español para el lector de pantalla.
  await expect(
    page.locator('[role="status"][aria-live="assertive"]').filter({ hasText: `«${titulo}»` }),
  ).toBeAttached()
  const anuncio = page.locator('[role="status"][aria-live="assertive"]')
  await capturar(page, info, 'tomada-con-el-teclado')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  // Se suelta cuando ya se anunció la columna: con la persona, el dibujo siempre llega antes que la tecla.
  await expect(anuncio.filter({ hasText: 'está sobre «Cotizado»' })).toBeAttached()
  await page.keyboard.press('Space')
  await expect(columna(page, 'Cotizado').getByRole('article', { name: titulo })).toBeVisible()
  const embudo = await embudoPorDefecto(t.personas.berta)
  await expect.poll(async () => (await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Cotizado'))
  // Esc cancela: queda donde estaba.
  await tarjeta(page, titulo).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await expect(columna(page, 'Cotizado').getByRole('article', { name: titulo })).toBeVisible()
})

// @sin-celular: el celular no arrastra: mueve con «Mover a» del «⋯», que cubren leads-oportunidades.spec.ts y leads-mover-con-motivo.spec.ts
test('si la base rechaza la movida (otra pestaña la movió antes), vuelve a su columna y avisa', async ({
  page,
}, info) => {
  const titulo = `Rechazo ${info.project.name}`
  const { op } = await irAlEmbudoDelLead(page, `Arr Rechazo ${info.project.name}`, titulo)
  const embudo = await embudoPorDefecto(t.personas.berta)
  // Otra pestaña la pasa a «Contactado» mientras ésta sigue viéndola en «Nuevo».
  const { error } = await rpcComo(t.personas.berta, 'oportunidad_mover', {
    p_id: op.id,
    p_etapa_esperada: op.etapa_id,
    p_etapa: etapa(embudo, 'Contactado'),
  })
  expect(error).toBeNull()
  await arrastrarA(page, titulo, 'Negociación')
  await expect(page.getByText(/ya está en «Contactado»/).first()).toBeVisible()
  await expect(columna(page, 'Nuevo').getByRole('article', { name: titulo })).toBeVisible()
  await expect.poll(async () => (await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Contactado'))
})
