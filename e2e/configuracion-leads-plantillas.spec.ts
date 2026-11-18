import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { esperarFichaHidratada, irAFicha, nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  GENERAR,
  dialogoDeOtorgar,
  fijarDireccionDeLaWeb,
  limpiarPortal,
  nombreDeLaEmpresa,
  prepararPortal,
  seccionPortal,
  type TerrenoDelPortal,
} from './soporte/leads-portal'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en el celular (.claude/rules/e2e.md › «Pruebas: sólo lo clave»)

// Las plantillas por empresa (9.04-5) contra la app compilada y el Supabase local: la dueña cambia el mensaje del portal y, al darle
// acceso a un lead, el texto para WhatsApp es el nuevo; la plantilla del embudo se guarda y se restablece. Que el embudo nuevo nazca con
// la plantilla lo prueba `supabase/tests/areas/plantillas/plantillas.sql`. Al terminar, `ajustes_leads` vuelve a lo de fábrica (un solo
// worker: los demás specs ven el texto y las etapas de fábrica).
test.describe.configure({ mode: 'serial' })

const PROPIO =
  'Hola {cliente}, entra a {direccion} con el código {codigo} y la clave {clave}. — {empresa}'

let t: TerrenoDelPortal

async function aLoDeFabrica() {
  const { error } = await admin()
    .from('ajustes_leads')
    .update({ embudo_etapas: null, portal_mensaje: null })
    .eq('id', 1)
  exigir(error, 'volver los ajustes de leads a lo de fábrica')
}

test.beforeAll(async ({}, info) => {
  await aLoDeFabrica()
  t = await prepararPortal(info.project.name)
  await fijarDireccionDeLaWeb(null)
})

test.afterAll(async () => {
  await aLoDeFabrica()
  await limpiarPortal(t)
})

const irA = async (page: Page, seccion: 'portal' | 'embudo') => {
  await entrar(page, t.personas.duena)
  await page.goto(`/configuracion/leads/${seccion}`)
}

// La barra de cambios sin guardar: aparece al cambiar algo y su «Guardar» envía el formulario.
const barraDe = (page: Page) => page.getByRole('region', { name: 'Cambios sin guardar' })
const guardarDe = (page: Page) => barraDe(page).getByRole('button', { name: 'Guardar' })

// Un `fill` antes de hidratar escribe en el HTML del servidor y React no se entera: la barra no aparece y no hay qué guardar. Se reescribe
// hasta que el formulario nota el cambio (el `fill` de después de hidratar reemplaza todo el valor).
async function escribirYEsperarElCambio(campo: Locator, texto: string) {
  await expect(async () => {
    await campo.fill(texto)
    await expect(barraDe(campo.page())).toBeVisible({ timeout: 500 })
  }).toPass()
}

test('la dueña cambia el mensaje del portal', async ({ page }) => {
  const empresa = await nombreDeLaEmpresa()
  await irA(page, 'portal')
  const campo = page.getByLabel('Texto para WhatsApp')
  // Parte del de fábrica, con sus variables; sin cambios no hay barra ni nada que guardar.
  await expect(campo).toHaveValue(/^Hola, \{cliente\}\.\n/)
  await expect(page.getByText('Es el texto de fábrica: nadie lo cambió todavía.')).toBeVisible()
  await expect(barraDe(page)).toHaveCount(0)
  const guardar = guardarDe(page)

  // Sin {clave} el motivo sale junto al campo y no se envía.
  await escribirYEsperarElCambio(campo, 'Hola {cliente}, tu código es {codigo}.')
  await guardar.click()
  await expect(
    page.getByText(
      'El mensaje tiene que llevar {codigo} y {clave}: sin ellos el cliente no puede entrar.',
    ),
  ).toBeVisible()

  await campo.fill(PROPIO)
  await expect(page.getByLabel('Vista previa del mensaje')).toHaveText(
    `Hola Ana Pérez, entra a la web de ${empresa} con el código EJM-4F2K9 y la clave K7M2Q9XWPR. — ${empresa}`,
  )
  await guardar.click()
  await expect(page.getByText('Mensaje del portal guardado.')).toBeVisible()
  await expect(barraDe(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Restablecer' })).toBeEnabled()
  await expect(page.getByText('Es el texto de fábrica: nadie lo cambió todavía.')).toHaveCount(0)
})

test('al dar acceso, el texto para WhatsApp sale del mensaje de la empresa', async ({
  page,
}, info) => {
  const empresa = await nombreDeLaEmpresa()
  // Pía da acceso a un lead suyo, con el mensaje que guardó la dueña en la prueba de arriba.
  const lead = await nuevoLead({
    corto: `Plantilla ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.pia.email,
  })
  await entrar(page, t.pia.email)
  await irAFicha(page, lead.id, '?seccion=portal')
  await esperarFichaHidratada(page)
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  await dialogoDeOtorgar(page).getByRole('button', { name: GENERAR }).click()
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const codigo = (await listo.getByLabel(/^Código:/).textContent()) ?? ''
  const clave = (await listo.getByLabel('Clave temporal').textContent()) ?? ''
  expect(codigo).not.toBe('')
  await expect(listo.getByLabel('Texto para WhatsApp')).toHaveText(
    `Hola ${lead.nombre}, entra a la web de ${empresa} con el código ${codigo} y la clave ${clave}. — ${empresa}`,
  )
})

test('la plantilla del embudo se guarda y se restablece', async ({ page }) => {
  await irA(page, 'embudo')
  const fabrica = page.getByText('Son las etapas de fábrica: nadie cambió la plantilla todavía.')
  const segunda = page.getByLabel('Nombre de la etapa 2')
  await expect(fabrica).toBeVisible()
  await expect(segunda).toHaveValue('Contactado')
  await expect(page.getByRole('button', { name: 'Restablecer' })).toBeDisabled()

  await escribirYEsperarElCambio(segunda, 'Llamado')
  await guardarDe(page).click()
  await expect(page.getByText('Plantilla del embudo guardada.')).toBeVisible()
  await expect(barraDe(page)).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('Nombre de la etapa 2')).toHaveValue('Llamado')
  await expect(fabrica).toHaveCount(0)

  await page.getByRole('button', { name: 'Restablecer' }).click()
  await expect(page).toHaveURL(/panel=restablecer-embudo/)
  const dialogo = page.getByRole('dialog', { name: 'Restablecer la plantilla del embudo' })
  await dialogo.getByRole('button', { name: 'Restablecer' }).click()
  await expect(page.getByText('La plantilla volvió a las etapas de fábrica.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByLabel('Nombre de la etapa 2')).toHaveValue('Contactado')
  await expect(fabrica).toBeVisible()
})

test('con cambios, «Descartar» repone lo guardado y salir por el menú pregunta', async ({
  page,
}) => {
  await irA(page, 'portal')
  const campo = page.getByLabel('Texto para WhatsApp')
  const guardado = await campo.inputValue()
  await escribirYEsperarElCambio(campo, `${guardado} Hasta pronto.`)
  await barraDe(page).getByRole('button', { name: 'Descartar' }).click()
  await expect(campo).toHaveValue(guardado)
  await expect(barraDe(page)).toHaveCount(0)

  // Salir con cambios por el menú de Configuración: pregunta en la barra y, al seguir editando, lo escrito queda.
  await escribirYEsperarElCambio(campo, `${guardado} Hasta pronto.`)
  const menu = page.getByRole('navigation', { name: 'Secciones de Configuración' })
  await menu.getByRole('link', { name: 'Plantilla del embudo' }).click()
  await expect(barraDe(page).getByText('Tienes cambios sin guardar.')).toBeVisible()
  await barraDe(page).getByRole('button', { name: 'Seguir editando' }).click()
  await expect(page).toHaveURL('/configuracion/leads/portal')
  await expect(campo).toHaveValue(`${guardado} Hasta pronto.`)

  // Descartar desde la pregunta sale a donde iba.
  await menu.getByRole('link', { name: 'Plantilla del embudo' }).click()
  await barraDe(page).getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL('/configuracion/leads/embudo')
  await expect(page.getByRole('heading', { name: 'Plantilla del embudo', level: 1 })).toBeVisible()
})
