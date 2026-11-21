import { z } from 'zod'
import { esquemaDeEntradas, esquemaDelTitulo } from './guardado'

// Lo tipeado de cada opción, sin la variante (la pone la base: glosario «Variante en par»).
const entradasSinVariante = esquemaDeEntradas.omit({ variante: true })
const dos = <T extends z.ZodType>(t: T) => z.tuple([t, t])

export const esquemaDeCrearEnPar = z.object({
  intentos: dos(z.guid()),
  origenId: z.guid(),
  leadId: z.guid().nullable(),
  vehiculoId: z.guid().nullable(),
  abierta: z.string().min(1).max(300),
  entradas: dos(entradasSinVariante),
  modoTc: z.string().min(1).max(200).nullable(),
  verTotalBs: z.boolean(),
  conLaAbierta: z.boolean(),
  titulo: esquemaDelTitulo,
  tituloManual: z.boolean(),
  privada: z.boolean().optional(),
})

export const esquemaDeGuardarEnPar = z.object({
  pedido: z.object({
    ids: dos(z.guid()),
    intentos: dos(z.guid()),
    // El texto de la base con sus microsegundos: nunca pasa por `Date`.
    actualizadosEn: dos(z.string().min(10).max(64)),
    entradas: dos(entradasSinVariante),
    notas: dos(z.string().max(2000).nullable()),
    modoTc: z.string().min(1).max(200).nullable(),
    verTotalBs: z.boolean(),
    titulo: esquemaDelTitulo,
    tituloManual: z.boolean(),
    vehiculoId: z.guid().nullable(),
    cambiaElVehiculo: z.boolean(),
  }),
  // Las etiquetas de las dos opciones: el aviso de un PT409 nombra la que cambió. No van a la base.
  etiquetas: dos(z.string().min(1).max(60)),
})

export const esquemaDeEncimaEnPar = z.object({
  anteriores: dos(z.guid()),
  intentos: dos(z.guid()),
  cual: z.union([z.literal(0), z.literal(1)]),
})
