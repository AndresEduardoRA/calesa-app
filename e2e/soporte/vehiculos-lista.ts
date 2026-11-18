// Lo que comparten los e2e de la lista de vehículos (cada vehículo, un enlace a su ficha): el terreno (dos personas que sólo leen, una con
// `leads.ver` y otra sin), cómo se encuentra la fila o la tarjeta de un vehículo y un clic que no es del nombre ni de una acción.
import { createHash } from 'node:crypto'
import { expect, type Locator, type Page } from './prueba'
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { CLAVE, aLaVista, limpiarInventario, prepararInventario, type Terreno } from './inventario'
import { borrarFotosDe, fotos } from './fotos'
import { borrarLeadsDePrueba } from './leads'
import { vehiculoPorTitulo } from './vehiculos'

export const TITULO = 'Kia Sportage'
export const OTRO = 'Hyundai Tucson 100%'
export const NO_EXISTE = '00000000-0000-4000-8000-000000000000'

export type TerrenoDeLaLista = {
  terreno: Terreno
  // Ve los vehículos de Corea y sus propios leads, pero no edita nada.
  lector: string
  // Ve los vehículos de Corea y nada de leads: no tiene «Interesados».
  lectorSinLeads: string
  // El vehículo con el que se prueba.
  id: string
}

// `ademas`: los permisos que la dueña de prueba suma (vitrina, papelera) para ver todo el «⋯».
export async function prepararLista(
  proyecto: string,
  ademas: Parameters<typeof prepararInventario>[1] = [],
): Promise<TerrenoDeLaLista> {
  const terreno = await prepararInventario(proyecto, ademas)
  const lector = correoDePrueba(`lector-resumen-${proyecto}`)
  await crearPersona({ email: lector, contrasena: CLAVE, nombre: 'Lola Lectora', invitada: true })
  await darRolDePrueba({
    email: lector,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lectora ${proyecto}`, clave: `e2e_lectora_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: terreno.corea.id },
      { clave: 'leads.ver', alcance: 'propios' },
    ],
  })
  const lectorSinLeads = correoDePrueba(`lector-sin-leads-${proyecto}`)
  await crearPersona({
    email: lectorSinLeads,
    contrasena: CLAVE,
    nombre: 'Lalo Lector',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectorSinLeads,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Lector sin leads ${proyecto}`,
      clave: `e2e_lector_sin_leads_${proyecto}`,
    },
    permisos: [{ clave: 'vehiculos.ver', origenId: terreno.corea.id }],
  })
  const id = (await vehiculoPorTitulo(TITULO))?.id ?? ''
  return { terreno, lector, lectorSinLeads, id }
}

export async function limpiarLista(vehiculoId: string): Promise<void> {
  await borrarFotosDe([vehiculoId])
  await borrarLeadsDePrueba()
  await limpiarInventario()
}

export const alInventario = (page: Page, origenId: string, extra = '') =>
  page.goto(`/vehiculos?origen=${origenId}${extra}`)

// La fila (escritorio) o la tarjeta (celular) de un vehículo.
export const filaDe = (page: Page, titulo: string): Locator =>
  aLaVista(page.locator('tbody tr, li article').filter({ hasText: titulo })).first()

// El nombre de la fila o la tarjeta: el enlace a la ficha (`<EnlaceDeLaFila>`), buscado dentro de la fila (ByRole sobre toda la página es lento
// con cientos de enlaces).
export const enlaceDe = (page: Page, titulo: string): Locator =>
  filaDe(page, titulo).getByRole('link', { name: titulo, exact: true })

// Un clic en lo que no es ni el nombre ni una acción (la esquina de arriba de la fila o la tarjeta) y la ficha que abre.
export async function abrirLaFicha(page: Page, titulo: string, id: string): Promise<void> {
  await filaDe(page, titulo).click({ position: { x: 6, y: 6 } })
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${id}$`))
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
}

// Fotos de prueba: se suben a Storage (la fila sólo nace apuntando a objetos que existen, con el nombre `<vehículo>/<sha-256>.jpg`) y se
// registran como la última edición lo haría. La miniatura es el mismo objeto (una foto de menos de 480 px lo es).
export async function sembrarFotos(vehiculoId: string, cuantas: number): Promise<void> {
  const filas = []
  for (const [indice, foto] of fotos(1, cuantas).entries()) {
    const hash = createHash('sha256').update(foto.buffer).digest('hex')
    const ruta = `${vehiculoId}/${hash}.jpg`
    const { error: errorDeSubida } = await admin()
      .storage.from('vehiculos')
      .upload(ruta, foto.buffer, { contentType: 'image/jpeg', upsert: true })
    expect(errorDeSubida).toBeNull()
    filas.push({
      vehiculo_id: vehiculoId,
      hash,
      ruta,
      ruta_miniatura: ruta,
      ancho: 800,
      alto: 600,
      bytes: foto.buffer.length,
      orden: indice + 1,
      es_portada: indice === 0,
    })
  }
  const { error } = await admin().from('vehiculos_imagenes').insert(filas)
  expect(error).toBeNull()
}
