import { expect, test } from './soporte/prueba'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'
import { entrar } from './soporte/inventario'
import { marcarInteres, vincular } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { tituloDeLaFicha } from './soporte/leads-ficha'
import {
  compartirCon,
  interesados,
  irAVehiculos,
  leadDe,
  leadDelVehiculo,
  limpiarVehiculosDelLead,
  panelAgregar,
  prepararVehiculosDelLead,
  vehiculoDe,
  vinculados,
  type TerrenoDeVehiculos,
} from './soporte/leads-vehiculos'

// Quién ve qué en la sección «Vehículos» del lead: el compartido ve lo que su alcance le deja, la
// supervisión ve todo y no agrega (pero desvincula, con confirmación), y sin permiso sobre vehículos
// no hay sección. La base vuelve a decidir: la RPC llamada a mano rechaza lo mismo.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeVehiculos
let corea = ''
let p = ''

test.beforeAll(async ({}, info) => {
  t = await prepararVehiculosDelLead(info.project.name)
  corea = t.inventario.corea.id
  p = info.project.name === 'movil' ? 'M' : 'E'
})

test.afterAll(async () => {
  await limpiarVehiculosDelLead()
})

// Un lead de Ada con un vehículo vinculado y otro de interés (los dos de Ada), compartido con Cora.
let alcance: {
  lead: { id: string; nombre: string }
  vinculado: string
  vinculadoId: string
  interes: string
  interesId: string
}

test('el compartido ve el vinculado (se lo da el vínculo) y no el interés en un vehículo que no ve', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Alcance ${p}`)
  const vinculado = `Familiar ${p}`
  const interes = `Deportivo ${p}`
  const vinculadoId = await vehiculoDe(corea, vinculado, t.ada)
  const interesId = await vehiculoDe(corea, interes, t.ada)
  await vincular(vinculadoId, lead.id)
  await marcarInteres({ vehiculoId: interesId, leadId: lead.id, quien: t.ada, nota: 'Solo de Ada' })
  await compartirCon(lead.id, t.cora, t.ada)
  alcance = { lead, vinculado, vinculadoId, interes, interesId }

  await entrar(page, t.cora)
  await irAVehiculos(page, lead.id)
  await expect(vinculados(page).getByRole('link', { name: vinculado })).toBeVisible()
  await expect(page.getByText(interes)).toHaveCount(0)
  // El bloque «Relacionados» de arriba cuenta lo que no ve, sin nombrarlo.
  await expect(
    page.getByRole('region', { name: 'Interesado', exact: true }).getByText('1 que no puedes ver'),
  ).toBeVisible()
})

test('la supervisión ve todo y no agrega (ni por la URL), pero desvincula con confirmación', async ({
  page,
  context,
}) => {
  const { lead, vinculado, vinculadoId, interesId } = alcance
  await entrar(page, t.sol)
  await irAVehiculos(page, lead.id, '&panel=agregar-vehiculo')
  await expect(panelAgregar(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vincular o marcar un vehículo' })).toHaveCount(0)
  await expect(interesados(page).getByText('Solo de Ada')).toBeVisible()
  // La base tampoco la deja: vincular pide la cartera del lead.
  const rechazo = await rpcComo(t.sol, 'vehiculo_vincular', {
    p_vehiculo: interesId,
    p_actualizado_en_esperado: new Date().toISOString(),
    p_lead: lead.id,
  })
  expect(rechazo.error?.message).toBe('No encontramos este lead o no tienes acceso.')
  // La confirmación tiene su URL: Esc, «atrás», recarga, sin red y un solo pedido.
  // «Desvincular» va en el «⋯» de su fila de Relacionados; sin la cartera lleva a la confirmación (`?panel=desvincular&vinculado=`).
  const disparador = vinculados(page).getByRole('button', { name: `Más acciones de ${vinculado}` })
  const dialogo = page.getByRole('dialog', { name: /^Desvincular/ })
  await cicloDeUnaConfirmacion(page, {
    abrir: async () => {
      await disparador.click()
      await page.getByRole('menuitem', { name: 'Desvincular', exact: true }).click()
    },
    dialogo,
    disparador,
    url: /panel=desvincular&vinculado=/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Desvincular', exact: true })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect.poll(() => leadDelVehiculo(vinculadoId)).toBeNull()
  await expect(dialogo).toBeHidden()
  // Un vehículo que ya no está vinculado no abre la confirmación.
  await noAbre(
    page,
    `/leads/${lead.id}?seccion=vehiculos&panel=desvincular&vinculado=${vinculadoId}`,
    'Ese vehículo ya no está vinculado a este lead.',
    /panel=desvincular/,
  )
})

test('sin permiso sobre vehículos no hay bloque Relacionados ni su gestión, ni por la URL', async ({
  page,
}) => {
  const lead = await leadDe(t.lia, `Sin vehículos ${p}`)
  await entrar(page, t.lia)
  await page.goto(`/leads/${lead.id}?seccion=vehiculos&panel=agregar-vehiculo`)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  const indice = page.getByRole('navigation', { name: 'Índice de la ficha' })
  await expect(indice.getByRole('link', { name: 'Relacionados' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Relacionados', exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Agregar vehículo' })).toHaveCount(0)
})
