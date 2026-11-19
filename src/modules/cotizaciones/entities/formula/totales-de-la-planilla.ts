// «Totales» de la planilla de la fórmula, con la unidad de ejemplo y el modo elegido (como «TOTALES» de V1): el total en dólares y en la moneda local, la base
// imponible y lo que va aparte (la garantía), cada uno con una línea de cómo sale. Puro y nunca lanza: lo arma la planilla una vez por cálculo de la unidad.
import { monedaDeFormato } from '../binding'
import type { Formula, Grupo, ModoDeCambio } from '../formula'
import type { Estado } from '../motor-contexto'
import { bucketDe, type Nodo } from '../nodos'
import { deDondeSale, type ContextoDeDondeSale } from './de-donde-sale'
import type { VistaPrevia } from './vista-previa'

export type LineaDeTotales =
  | {
      tipo: 'monto'
      titulo: string
      valor: number | null
      // La moneda de `<Monto>`; sin ella, la de la empresa.
      moneda: string | undefined
      comoSale: string
    }
  // Lo que va aparte con su nodo apagado (otra variante o su interruptor): no suma cero, dice por qué.
  | { tipo: 'apagada'; titulo: string; motivo: string; comoSale: string }

type Calculada = Extract<VistaPrevia, { tipo: 'calculada' }>

const MONEDA_LOCAL = 'moneda local'

// Un término del total en la moneda local: lo que se multiplica por el tipo de cambio de su bucket.
type Termino = { etiqueta: string; bucket: string }

const etiquetaDe = (id: string | undefined, ctx: ContextoDeDondeSale): string =>
  id === undefined ? 'un tipo de cambio que no está' : (ctx.nodos.get(id)?.etiqueta ?? id)

// Con grupos, los que se dibujan; sin grupos, el total con su bucket o cada término directo de una suma, sin los que quedan fuera de la variante (el motor no los cuenta).
function terminosDe(formula: Formula, vista: Calculada, total: Nodo | undefined): Termino[] {
  const grupos: readonly Grupo[] = formula.definicion.grupos ?? []
  if (grupos.length > 0) {
    return grupos
      .filter((g) => vista.grupos.get(g.id)?.seDibuja !== false)
      .map((g) => ({ etiqueta: g.etiqueta, bucket: g.bucket }))
  }
  if (total === undefined) return []
  const delTotal = bucketDe(total)
  if (delTotal !== undefined) return [{ etiqueta: total.etiqueta, bucket: delTotal }]
  if (total.tipo !== 'calculo' || total.op !== 'suma') return []
  const nodos = new Map(formula.definicion.nodos.map((n) => [n.id, n]))
  return total.de.flatMap((id) => {
    const n = nodos.get(id)
    const bucket = n === undefined ? undefined : bucketDe(n)
    if (n === undefined || bucket === undefined) return []
    return vista.estados.get(id) === 'fuera_de_variante' ? [] : [{ etiqueta: n.etiqueta, bucket }]
  })
}

// «(Lado de afuera + Gastos) × TC paralelo + Impuestos × TC oficial»: los términos juntos por tipo de cambio, en el orden en que aparece cada uno.
function comoSaleLaMonedaLocal(
  terminos: readonly Termino[],
  buckets: Readonly<Record<string, string>>,
  ctx: ContextoDeDondeSale,
): string {
  const porCambio = new Map<string, string[]>()
  for (const t of terminos) {
    const tc = Object.hasOwn(buckets, t.bucket) ? buckets[t.bucket] : undefined
    const clave = etiquetaDe(tc, ctx)
    const lista = porCambio.get(clave) ?? []
    lista.push(t.etiqueta)
    porCambio.set(clave, lista)
  }
  return [...porCambio]
    .map(([tc, etiquetas]) =>
      etiquetas.length === 1
        ? `${etiquetas.join('')} × ${tc}`
        : `(${etiquetas.join(' + ')}) × ${tc}`,
    )
    .join(' + ')
}

function motivoDeLaApagada(n: Nodo, estado: Exclude<Estado, 'activo'>, ctx: ContextoDeDondeSale) {
  if (estado === 'fuera_de_variante') return 'Apagada: no va en la variante elegida.'
  const condicion = 'condicion' in n ? n.condicion : undefined
  return `Apagada: falta encender «${etiquetaDe(condicion, ctx)}».`
}

// La línea de un nodo que se muestra y no suma (la base imponible o lo aparte).
function lineaDelNodo(
  n: Nodo,
  titulo: string,
  vista: Calculada,
  ctx: ContextoDeDondeSale,
): LineaDeTotales {
  const comoSale = deDondeSale(n, ctx)
  const estado = vista.estados.get(n.id)
  if (estado !== undefined && estado !== 'activo') {
    return { tipo: 'apagada', titulo, motivo: motivoDeLaApagada(n, estado, ctx), comoSale }
  }
  const valor = vista.valores.get(n.id)
  return {
    tipo: 'monto',
    titulo,
    valor: typeof valor === 'number' ? valor : null,
    moneda: monedaDeFormato(n.formato ?? 'usd'),
    comoSale,
  }
}

// Las líneas de «Totales», en el orden de V1. `modo` es el que recibió el motor (sin él, los `buckets` y `total_en` de la fórmula).
export function totalesDeLaUnidad(
  formula: Formula,
  vista: Calculada,
  modo: ModoDeCambio | undefined,
  ctx: ContextoDeDondeSale,
): LineaDeTotales[] {
  const nodos = formula.definicion.nodos
  const total = nodos.find((n) => n.salida === 'total')
  const cambio = modo ?? {
    buckets: formula.definicion.buckets ?? {},
    total_en: formula.definicion.total_en,
  }
  const { monedaBs } = vista.totales
  const enLaLocal = `total en ${monedaBs ?? MONEDA_LOCAL}`
  const lineas: LineaDeTotales[] = [
    {
      tipo: 'monto',
      titulo: 'Total en dólares',
      valor: vista.totales.usd,
      moneda: 'USD',
      comoSale:
        cambio.total_en === undefined
          ? total === undefined
            ? 'la suma de los dólares'
            : deDondeSale(total, ctx)
          : `${enLaLocal} ÷ ${etiquetaDe(cambio.total_en, ctx)}`,
    },
    {
      tipo: 'monto',
      titulo: `Total en ${monedaBs ?? MONEDA_LOCAL}`,
      valor: vista.totales.bs,
      moneda: monedaBs ?? undefined,
      comoSale: comoSaleLaMonedaLocal(terminosDe(formula, vista, total), cambio.buckets, ctx),
    },
  ]
  const base = nodos.find((n) => n.salida === 'base_imponible')
  if (base !== undefined) {
    lineas.push(lineaDelNodo(base, `Base imponible (${base.etiqueta})`, vista, ctx))
  }
  for (const n of nodos) {
    if (n.salida === 'aparte') lineas.push(lineaDelNodo(n, `${n.etiqueta} (aparte)`, vista, ctx))
  }
  return lineas
}
