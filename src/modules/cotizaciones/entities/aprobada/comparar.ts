// «Comparar cotizaciones» (`docs/GLOSARIO.md`): de lo leído (la hoja guardada de cada una y sus marcas) al modelo plano que dibuja la página, sin `Map` ni diseño (cruza al
// navegador). Si se comparan, las cabeceras de las columnas y por qué «Aprobar esta» queda apagado. Puro: sin React ni Supabase.
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../primer-resultado'
import {
  diferenciaContraLaPrimera,
  filasAlineadas,
  type Diferencia,
  type FilaDeComparar,
} from './comparar-alineacion'
import { motivoParaNoAprobarEsta, tituloDeLaFila, type AprobarEn } from './de-este-vehiculo'
import type { MarcaParaComparar } from './tipos'

export type {
  CeldaComparada,
  Diferencia,
  FilaDeComparar,
  FormatoDeFila,
  ValorComparado,
} from './comparar-alineacion'

// Lo que la lectura dejó de cada columna, en el orden de la URL: la hoja o por qué no llegó (`sin_permiso` = el 42501 de la base: no existe, papelera o no se ve).
export type ColumnaLeida =
  { id: string; hoja: HojaDeUnaGuardada } | { id: string; error: 'sin_permiso' | 'fallo' }

export type LecturaParaComparar = { columnas: ColumnaLeida[]; marcas: MarcaParaComparar[] }

export type ColumnaDeComparar =
  | {
      tipo: 'cotizacion'
      id: string
      numero: number
      titulo: string
      autor: string
      // Como los devolvió la base: la versión no pasa por `Date`.
      creadoEn: string
      actualizadoEn: string
      origenId: string
      origen: string
      versionDeLaFormula: number
      final: boolean
      vencida: boolean
      estado: MarcaParaComparar['estado']
      // El total guardado (`totales.usd`) y cómo es contra la primera columna.
      total: { valor: number | null; moneda: string; diferencia: Diferencia }
      // El nombre del modo de tipo de cambio con que se guardó, o nada.
      modo: string | null
    }
  // La hoja no se pudo leer (no el 42501: ése no se compara). Sus celdas son de error.
  | { tipo: 'error'; id: string; numero: number }

export type ModeloDeComparar = {
  vehiculoId: string
  columnas: ColumnaDeComparar[]
  filas: FilaDeComparar[]
  // La aprobada del vehículo si es una de las comparadas.
  aprobadaId: string | null
}

export type VeredictoDeComparar =
  { tipo: 'se_comparan'; vehiculoId: string } | { tipo: 'no_se_comparan' }

// Se comparan sólo si todas se ven (ningún 42501 y la marca de cada una llegó con la RLS de quien mira) y son del mismo vehículo. El vehículo se mira en las marcas:
// así cuenta también una columna cuya hoja falló.
export function veredictoDeComparar(lectura: LecturaParaComparar): VeredictoDeComparar {
  const no = { tipo: 'no_se_comparan' } as const
  if (lectura.columnas.some((c) => 'error' in c && c.error === 'sin_permiso')) {
    return no
  }
  const marcas = new Map(lectura.marcas.map((m) => [m.id, m]))
  const vehiculos = new Set<string | null>()
  for (const columna of lectura.columnas) {
    const marca = marcas.get(columna.id)
    if (marca === undefined) {
      return no
    }
    vehiculos.add(marca.vehiculoId)
  }
  const [vehiculoId] = [...vehiculos]
  return vehiculos.size === 1 && typeof vehiculoId === 'string'
    ? { tipo: 'se_comparan', vehiculoId }
    : no
}

// El modo con que se guardó: el de su clave o, sin clave, el primero del diseño (el que trae la fórmula). Sin modos, nada.
export function modoDeLaCotizacion(hoja: HojaDeUnaGuardada): string | null {
  const modos = hoja.diseno.cabecera.modos
  const clave = hoja.cotizacion.modoTc
  return (clave === null ? modos[0] : modos.find((m) => m.clave === clave))?.nombre ?? null
}

function columnaDe(
  hoja: HojaDeUnaGuardada,
  marca: MarcaParaComparar,
  tituloDelVehiculo: string | null,
  totalDeLaPrimera: number | null | undefined,
): ColumnaDeComparar {
  const c = hoja.cotizacion
  const total = hoja.guardado.totalUsd
  return {
    tipo: 'cotizacion',
    id: c.id,
    numero: c.numero,
    titulo: tituloDeLaFila(c, tituloDelVehiculo),
    autor: marca.autor,
    creadoEn: c.creadoEn,
    actualizadoEn: c.actualizadoEn,
    origenId: c.origenId,
    origen: hoja.diseno.origen.nombre,
    versionDeLaFormula: hoja.diseno.formula.version,
    final: c.clase === 'final',
    vencida: hoja.vencida,
    estado: marca.estado,
    total: {
      valor: total,
      moneda: MONEDA_DEL_PRIMER_RESULTADO,
      diferencia:
        totalDeLaPrimera === undefined
          ? 'igual'
          : diferenciaContraLaPrimera(totalDeLaPrimera, total),
    },
    modo: modoDeLaCotizacion(hoja),
  }
}

// El modelo de la página. Supone `veredictoDeComparar` en `se_comparan` (la marca de cada columna está).
export function compararCotizaciones(
  lectura: LecturaParaComparar,
  vehiculoId: string,
  tituloDelVehiculo: string | null,
): ModeloDeComparar {
  const marcas = new Map(lectura.marcas.map((m) => [m.id, m]))
  const hojas = lectura.columnas.map((c) => ('hoja' in c ? c.hoja : null))
  const primera = hojas.find((h) => h !== null)
  const columnas = lectura.columnas.map((c): ColumnaDeComparar => {
    const marca = marcas.get(c.id)
    const numero = marca?.numero ?? 0
    if (!('hoja' in c) || marca === undefined) {
      return { tipo: 'error', id: c.id, numero }
    }
    const totalDeLaPrimera = c.hoja === primera ? undefined : (primera?.guardado.totalUsd ?? null)
    return columnaDe(c.hoja, marca, tituloDelVehiculo, totalDeLaPrimera)
  })
  return {
    vehiculoId,
    columnas,
    filas: filasAlineadas(hojas),
    aprobadaId: lectura.columnas.find((c) => marcas.get(c.id)?.aprobada === true)?.id ?? null,
  }
}

// Por qué «Aprobar esta» de una columna queda apagado (nulo = se puede): el permiso del origen y después inválida, como la base y como «De este vehículo».
export function motivoDeLaColumna(
  columna: Pick<
    Extract<ColumnaDeComparar, { tipo: 'cotizacion' }>,
    'origenId' | 'origen' | 'estado'
  >,
  aprobarEn: AprobarEn,
): string | null {
  return motivoParaNoAprobarEsta(columna, aprobarEn)
}
