// Las hojas y marcas con que se prueba «Comparar cotizaciones» (`comparar*.test.ts`). Sólo para las pruebas.
import type { CeldaDeHoja, ItemDeHoja, SeccionDeHoja } from '../hoja'
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import type { FilaDeComparar } from './comparar-alineacion'
import type { MarcaParaComparar } from './tipos'

export const ORIGEN = '99999999-9999-4999-8999-999999999999'
export const VEHICULO = '88888888-8888-4888-8888-888888888888'
export const OTRO_VEHICULO = '77777777-7777-4777-8777-777777777777'
export const A = '11111111-1111-4111-8111-111111111111'
export const B = '22222222-2222-4222-8222-222222222222'
export const C = '33333333-3333-4333-8333-333333333333'

export const celda = (
  nodo: string,
  etiqueta: string,
  mas: Partial<CeldaDeHoja> = {},
): CeldaDeHoja => ({
  tipo: 'celda',
  nodo,
  etiqueta,
  tipoDeNodo: 'input',
  formato: 'usd',
  ancho: 'mitad',
  tono: null,
  ajustes: false,
  ayuda: null,
  datoDelVehiculo: null,
  soloEn: null,
  condicion: null,
  requeridoSi: null,
  secundario: null,
  editable: false,
  motivo: null,
  ...mas,
})

export const seccion = (id: string, titulo: string | null, items: ItemDeHoja[]): SeccionDeHoja => ({
  id,
  titulo,
  presentacion: 'principal',
  items,
})

type Datos = {
  id: string
  numero: number
  secciones: SeccionDeHoja[]
  valores: Record<string, number | string | null>
  total?: number | null
  modoTc?: string | null
  version?: number
  titulo?: string | null
  aparte?: { nodo: string; etiqueta: string }[]
}

export function hoja(d: Datos): HojaDeUnaGuardada {
  return {
    diseno: {
      origen: { id: ORIGEN, nombre: 'Japón' },
      formula: { id: d.id, version: d.version ?? 1 },
      cabecera: {
        modos: [
          { clave: 'm1', nombre: 'Oficial' },
          { clave: 'm2', nombre: 'Paralelo' },
        ],
        verTotalBs: false,
        monedaBs: null,
        ajustes: false,
        modoPorDefecto: null,
        verTotalBsPorDefecto: false,
        modosVisibles: null,
      },
      secciones: d.secciones,
      tarjetaTotal: {
        nodo: 'total',
        etiqueta: 'Total',
        formato: 'usd',
        secundarios: (d.aparte ?? []).map((a) => ({ ...a, formato: 'usd' as const })),
      },
      tonos: [],
    },
    cotizacion: {
      id: d.id,
      numero: d.numero,
      clase: 'preventa',
      version: 1,
      origenId: ORIGEN,
      leadId: null,
      vehiculoId: VEHICULO,
      modoTc: d.modoTc ?? null,
      verTotalBs: false,
      titulo: d.titulo ?? null,
      tituloManual: false,
      notas: null,
      creadoEn: '2026-11-17T10:00:00.123456+00:00',
      actualizadoEn: '2026-11-17T10:00:00.123456+00:00',
    },
    guardado: {
      valores: new Map(Object.entries(d.valores)),
      fuentes: new Map(),
      totalUsd: d.total ?? null,
      totalBs: null,
    },
    puedeGuardar: false,
    venceEl: '2026-12-01',
    vencida: false,
    publicada: null,
    cadena: { anterior: null, encima: null, puedeCotizarEncima: false },
  }
}

export const marca = (
  id: string,
  numero: number,
  mas: Partial<MarcaParaComparar> = {},
): MarcaParaComparar => ({
  id,
  numero,
  vehiculoId: VEHICULO,
  origenId: ORIGEN,
  estado: 'activa',
  autor: 'Gala',
  aprobada: false,
  ...mas,
})

// Las filas como texto: «# sección» y «nodo: celda | celda».
export function texto(filas: FilaDeComparar[]): string[] {
  return filas.map((f) =>
    f.tipo === 'seccion'
      ? `# ${f.rotulo}`
      : `${f.nodo} ${f.rotulo}: ${f.celdas
          .map((c) => (c.tipo === 'valor' ? `${String(c.valor)} ${c.diferencia}` : c.tipo))
          .join(' | ')}`,
  )
}

export const PRECIO = seccion('precio', 'Precio', [celda('fob', 'FOB'), celda('flete', 'Flete')])
