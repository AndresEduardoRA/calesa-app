// La plantilla de la tarjeta de la cotización como cuadrícula (la forma 2 de `plantillas_tarjeta.definicion`): tipos y constantes, sin lógica. Vive en el
// núcleo porque la usan dos áreas: `plantilla` (la valida, la convierte desde la forma 1 y arma la vista previa) y `tarjeta` (la lee y la dibuja). Las
// listas cerradas y los topes tienen su copia en la base (`_plantilla_cuadricula_forma()`): si cambian aquí, cambian allá. docs/COTIZADOR.md › «Plantilla de
// tarjeta (PDF)».

export const FORMA_DE_LA_CUADRICULA = 2

// Las variables que puede mostrar una celda: lo de la cotización que no es un nodo de la fórmula.
export const VARIABLES_DE_LA_TARJETA = [
  'fecha_larga',
  'numero',
  'titulo',
  'titulo_opcion',
  'asesor_nombre',
  'asesor_iniciales',
  'cliente_nombre',
  'vehiculo_titulo',
  'vehiculo_lote',
  'vehiculo_vin',
  'vence_el',
  'modo_tc',
] as const
export type VariableDeLaTarjeta = (typeof VARIABLES_DE_LA_TARJETA)[number]

// Lo que una celda muestra de un nodo de la fórmula.
export const MOSTRAR = [
  'monto',
  'etiqueta',
  'descripcion',
  'porcentaje',
  'tc_nombre',
  'tc_valor',
  'plazo',
] as const
export type Mostrar = (typeof MOSTRAR)[number]

// Cuándo una fila no se dibuja, según el nodo de la fila.
export const OCULTAR_SI = ['nunca', 'no_aplica', 'no_aplica_o_cero'] as const
export type OcultarSi = (typeof OCULTAR_SI)[number]

export const TAMANOS_DE_LETRA = [10, 11, 12, 14, 16, 18, 22, 28] as const
export type TamanoDeLetra = (typeof TAMANOS_DE_LETRA)[number]
export const ALINEAR = ['izquierda', 'centro', 'derecha'] as const
export const ALINEAR_VERTICAL = ['arriba', 'centro', 'abajo'] as const
export const BORDES = ['ninguno', 'fino', 'grueso'] as const
export type Borde = (typeof BORDES)[number]
export const LADOS = ['arriba', 'derecha', 'abajo', 'izquierda'] as const
export type Lado = (typeof LADOS)[number]

// `fondo` y `texto` son una clave del catálogo de colores o `auto` (fondo blanco; texto negro o blanco, el de más contraste).
export const COLOR_AUTOMATICO = 'auto'

// Lo que vale una clave ausente de `estilo` (D1: se ahorran bytes).
export const ESTILO_POR_OMISION = {
  fondo: COLOR_AUTOMATICO,
  texto: COLOR_AUTOMATICO,
  negrita: false,
  cursiva: false,
  tamano: 12,
  alinear: 'izquierda',
  alinear_vertical: 'centro',
} as const

// Los topes de la forma 2.
export const MAXIMO_DE_COLUMNAS = 16
export const MAXIMO_DE_FILAS = 120
export const MAXIMO_DE_CELDAS = 1000
export const ANCHO_TOTAL_MAXIMO = 1600
export const ANCHO_DE_COLUMNA = { minimo: 24, maximo: 640 } as const
export const ALTO_DE_FILA = { minimo: 16, maximo: 240 } as const
export const MAXIMO_DE_CARACTERES_DE_UN_TEXTO = 300
// El texto del `jsonb` (`octet_length(definicion::text)`): el doble de la plantilla de V1 más grande, a KiB enteros (docs/DECISIONES.md).
export const TOPE_EN_BYTES_DE_LA_CUADRICULA = 24576

// Las columnas que pone la conversión de la forma 1, en su orden, con su ancho en px (650 como máximo: entra en A4 a escala 1).
export const COLUMNAS_DE_LA_CONVERSION = [
  { id: 'grupo', ancho: 100 },
  { id: 'concepto', ancho: 190 },
  { id: 'monto', ancho: 110 },
  { id: 'leyenda', ancho: 170 },
  { id: 'tipo_cambio', ancho: 90 },
  { id: 'plazo', ancho: 90 },
] as const

export type ColumnaDeLaTarjeta = { readonly id: string; readonly ancho: number }

export type FilaDeLaTarjeta = {
  readonly id: string
  readonly alto: number
  readonly ocultar_si: OcultarSi
  // Obligatorio salvo con `nunca` (y ausente con `nunca`).
  readonly nodo?: string
}

export type ContenidoDeLaCelda =
  | { readonly tipo: 'texto'; readonly texto: string }
  | { readonly tipo: 'dato'; readonly variable: string }
  | { readonly tipo: 'dato'; readonly nodo: string; readonly mostrar: Mostrar }
  | { readonly tipo: 'logo' }
  | { readonly tipo: 'vacio' }

export type BordesDeLaCelda = { readonly todos?: Borde } & { readonly [L in Lado]?: Borde }

export type EstiloDeLaCelda = {
  readonly fondo?: string
  readonly texto?: string
  readonly negrita?: boolean
  readonly cursiva?: boolean
  readonly tamano?: TamanoDeLetra
  readonly alinear?: (typeof ALINEAR)[number]
  readonly alinear_vertical?: (typeof ALINEAR_VERTICAL)[number]
  readonly bordes?: BordesDeLaCelda
}

export type CeldaDeLaTarjeta = {
  readonly id: string
  readonly fila: string
  readonly columna: string
  readonly abarca_columnas?: number
  readonly abarca_filas?: number
  readonly contenido: ContenidoDeLaCelda
  readonly estilo?: EstiloDeLaCelda
}

export type PlantillaEnCuadricula = {
  readonly forma: typeof FORMA_DE_LA_CUADRICULA
  readonly columnas: readonly ColumnaDeLaTarjeta[]
  readonly filas: readonly FilaDeLaTarjeta[]
  readonly celdas: readonly CeldaDeLaTarjeta[]
}

// Lo que la tarjeta necesita para dibujar una forma 2, plano (arreglos, sin `Map`: cruza props de una página de servidor a un componente de cliente). Lo arman
// la vista previa de Configuración (con la fórmula reducida y cifras de ejemplo) y la lectura de `cotizacion_tarjeta`; sólo trae lo que la plantilla nombra.
export type LecturaEnCuadricula = {
  readonly definicion: PlantillaEnCuadricula
  readonly nodos: readonly {
    readonly id: string
    readonly etiqueta: string
    readonly descripcion: string | null
    readonly grupo: string | null
    // El `pct` del par, sólo si la plantilla muestra su porcentaje.
    readonly pct: string | null
  }[]
  readonly grupos: readonly {
    readonly id: string
    readonly etiqueta: string
    readonly plazo: string | null
    readonly bucket: string | null
  }[]
  // El tipo de cambio de cada bucket por omisión y en cada modo: el nombre que se dice y el nodo cuyo valor se muestra.
  readonly tiposDeCambio: {
    readonly buckets: readonly {
      readonly bucket: string
      readonly nombre: string | null
      readonly nodo: string | null
    }[]
    readonly modos: readonly {
      readonly modo: string
      readonly bucket: string
      readonly nombre: string | null
      readonly nodo: string | null
    }[]
  }
  readonly modos: readonly { readonly clave: string; readonly nombre: string }[]
  readonly variante: {
    readonly nodo: string
    readonly opciones: readonly { readonly clave: string; readonly titulo: string }[]
  } | null
  readonly colores: readonly { readonly clave: string; readonly hex: string }[]
  readonly total: { readonly nodo: string | null }
}
