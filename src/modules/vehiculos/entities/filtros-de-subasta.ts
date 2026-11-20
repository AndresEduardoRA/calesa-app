// «Subasta» y el orden del inventario: sólo en un origen de subasta. «Subasta» es una opción a la vez (`eleccion`): cuándo cierra (las tres ventanas, que
// cuentan desde ahora en la zona de la empresa: `ventana-del-cierre.ts`), «Todas las vivas», «Sin resolver» o «No ganadas». El orden («Más recientes» o
// «Cierre más próximo») es otra `eleccion`, justo después: su por defecto es el cierre cuando «Subasta» tiene valor, así que la página lo resuelve antes de
// armar el esquema (`subastaElegida`). Los dos viajan en la URL y en las vistas guardadas como cualquier filtro.
import type {
  DefFiltro,
  EsquemaDeFiltros,
  ValorDeFiltro,
  ValoresDeFiltros,
} from '@/shared/lib/filtros'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import type { SituacionPropia } from './situacion'
import { esVentanaDelCierre, ventanaDelCierre } from './ventana-del-cierre'

export const FILTRO_SUBASTA = 'subasta'
export const FILTRO_ORDEN = 'orden'

// El por defecto de «Subasta»: sin filtrar. «Cualquiera» y no «Todas», que se confundiría con «Todas las vivas».
export const SUBASTA_CUALQUIERA = 'cualquiera'

// Los valores de «Subasta», en el orden del filtro.
export const VALORES_DE_SUBASTA = [
  SUBASTA_CUALQUIERA,
  'hoy',
  '48h',
  'semana',
  'vivas',
  'sin_resolver',
  'no_ganadas',
] as const

export type ValorDeSubasta = (typeof VALORES_DE_SUBASTA)[number]

const ETIQUETA_DE_SUBASTA: Record<ValorDeSubasta, string> = {
  cualquiera: 'Cualquiera',
  hoy: 'Cierra hoy',
  '48h': 'Cierra en 48 h',
  semana: 'Cierra esta semana',
  vivas: 'Todas las vivas',
  sin_resolver: 'Sin resolver',
  no_ganadas: 'No ganadas',
}

// Los que son una situación propia de la base, sin ventana: «No ganadas» en plural (el filtro habla de vehículos; la insignia, de la subasta).
export const SITUACION_DE_SUBASTA = {
  vivas: 'en_subasta',
  sin_resolver: 'sin_resolver',
  no_ganadas: 'no_ganada',
} as const satisfies Partial<Record<ValorDeSubasta, SituacionPropia>>

export const ORDENES_DEL_INVENTARIO = ['reciente', 'cierre'] as const

export type OrdenDelInventario = (typeof ORDENES_DEL_INVENTARIO)[number]

const ETIQUETA_DE_ORDEN: Record<OrdenDelInventario, string> = {
  reciente: 'Más recientes',
  cierre: 'Cierre más próximo',
}

// Si un texto de la URL es un valor de «Subasta» que filtra (no el por defecto): la página lo mira antes de armar el esquema.
export function esSubastaElegida(texto: string | undefined): boolean {
  return (
    texto !== undefined &&
    texto !== SUBASTA_CUALQUIERA &&
    (VALORES_DE_SUBASTA as readonly string[]).includes(texto)
  )
}

export function filtroDeSubasta(): DefFiltro {
  return {
    tipo: 'eleccion',
    clave: FILTRO_SUBASTA,
    etiqueta: 'Subasta',
    opciones: VALORES_DE_SUBASTA.map((valor) => ({ valor, etiqueta: ETIQUETA_DE_SUBASTA[valor] })),
    porDefecto: SUBASTA_CUALQUIERA,
  }
}

export function filtroDeOrden(subastaElegida: boolean): DefFiltro {
  return {
    tipo: 'eleccion',
    clave: FILTRO_ORDEN,
    etiqueta: 'Orden',
    opciones: ORDENES_DEL_INVENTARIO.map((valor) => ({
      valor,
      etiqueta: ETIQUETA_DE_ORDEN[valor],
    })),
    porDefecto: subastaElegida ? 'cierre' : 'reciente',
  }
}

// La condición de un valor de «Subasta» (sin importar `infra/`, por eso la forma va escrita acá). Las ventanas necesitan `ahora`: sin él no filtran.
export type CondicionDeSubasta =
  | { tipo: 'situacion_en'; situaciones: SituacionPropia[]; fases: string[]; sinFase: boolean }
  | { tipo: 'cierre_entre'; desde: string; hasta: string }

export function condicionDeSubasta(
  valor: ValorDeFiltro,
  { ahora, zona }: { ahora?: string; zona?: string },
): CondicionDeSubasta | null {
  if (valor.tipo !== 'eleccion') return null
  const texto = valor.valor
  if (esVentanaDelCierre(texto)) {
    if (ahora === undefined) return null
    return { tipo: 'cierre_entre', ...ventanaDelCierre(texto, ahora, zona ?? ZONA_POR_DEFECTO) }
  }
  if (texto in SITUACION_DE_SUBASTA) {
    const situacion = SITUACION_DE_SUBASTA[texto as keyof typeof SITUACION_DE_SUBASTA]
    return { tipo: 'situacion_en', situaciones: [situacion], fases: [], sinFase: false }
  }
  return null
}

// El orden que se pide: el elegido, o el por defecto del esquema; sin el filtro (un origen manual), siempre el de siempre.
export function ordenElegido(
  esquema: EsquemaDeFiltros,
  valores: ValoresDeFiltros,
): OrdenDelInventario {
  const def = esquema.filtros.find((filtro) => filtro.clave === FILTRO_ORDEN)
  if (def?.tipo !== 'eleccion') return 'reciente'
  const valor = valores.porClave[FILTRO_ORDEN]
  const texto = valor?.tipo === 'eleccion' ? valor.valor : def.porDefecto
  return texto === 'cierre' ? 'cierre' : 'reciente'
}
