// Lo que el listado recibe ya resuelto por la página.
import type { FaseResumen } from '@/modules/flujos/client'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import type { AlcanceDeAvisos } from '../../../entities/avisos-de-vehiculo'
import type { ParaCotizar } from '../../../entities/ruta-para-cotizar'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  estadoDeVitrina,
  motivosDeNoVisible,
  type EstadoDeVitrina,
  type MotivoDeNoVisible,
  type PermisoDeVitrina,
  type VitrinaDelOrigen,
} from '../../../entities/vitrina'

export type DatosDelOrigen = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  fases: readonly FaseResumen[]
  categorias: readonly Categoria[]
  // Lo que hace falta para que algo de este origen se vea en la web: de acá sale la insignia.
  vitrina: VitrinaDelOrigen
  // El día de hoy en la zona de la empresa, si la limpieza automática aplica a este origen y está
  // encendida: con él cada fila dice «Se limpia el dd/mm». null = no hay nada que decir.
  limpiezaHoy: string | null
  // El instante (ISO) con el que el servidor dibujó la lista: la cuenta regresiva de la subasta empieza en él (el mismo texto al hidratar) y sigue con el reloj de la página.
  ahora: string
}

export type FilaDeVehiculo = Vehiculo

// Lo que decide qué ofrece el «⋯» de cada fila, resuelto por la página: quién edita (los de esta página) y si se edita en el origen, a quién se puede
// enviar a la papelera, si se puede publicar, cotizar y ver la actividad, y qué se puede consultar en apibara; y lo que abre cada panel de la lista
// (un solo hook por panel: ninguna fila suma hooks).
export type ParaElMenuDeLaLista = {
  editables: ReadonlySet<string>
  // Quien mira tiene `vehiculos.editar` en este origen: lo que no está en `editables` se ve apagado («propios»), no oculto.
  editaEnElOrigen: boolean
  eliminables: ReadonlySet<string>
  publicar: PermisoDeVitrina
  // Los de esta página cuyo lead quien mira puede abrir («Ver el lead» en el aviso de un vehículo vinculado) y lo que puede abrir desde un aviso.
  leadsVisibles: ReadonlySet<string>
  alcance: AlcanceDeAvisos
  // «Cotizar vehículo»: la hoja de cotizar de este origen, o null si quien mira no cotiza en él (`origenesParaCotizar()`, lo decide la página).
  cotizar: ParaCotizar | null
  // «Ver actividad»: la plantilla de `/actividad` con `MARCADOR_DE_VEHICULO` (cada fila pone su id), o null sin `actividad.ver`.
  paraActividad: string | null
  // «Actualizar los datos»: en un origen de subasta con apibara, los de esta página que tienen enlace, lote o VIN (`entradaDeRefresco()`); null = no aplica.
  consultables: ReadonlySet<string> | null
  abrirVitrina: (id: string) => void
  abrirImagenes: (id: string) => void
  abrirActualizar: (id: string) => void
}

export type DatosDelMenuDeLaLista = {
  editables: readonly string[]
  editaEnElOrigen: boolean
  eliminables: readonly string[]
  leadsVisibles: readonly string[]
  alcance: AlcanceDeAvisos
  publicar: PermisoDeVitrina
  cotizar: ParaCotizar | null
  paraActividad: string | null
  consultables: readonly string[] | null
}

// Lo que recibe el listado como listas, hecho conjuntos para preguntar por fila, con lo que abre cada panel.
export function paraElMenuDe(
  datos: DatosDelMenuDeLaLista,
  paneles: Pick<ParaElMenuDeLaLista, 'abrirVitrina' | 'abrirImagenes' | 'abrirActualizar'>,
): ParaElMenuDeLaLista {
  return {
    editables: new Set(datos.editables),
    editaEnElOrigen: datos.editaEnElOrigen,
    eliminables: new Set(datos.eliminables),
    leadsVisibles: new Set(datos.leadsVisibles),
    alcance: datos.alcance,
    publicar: datos.publicar,
    cotizar: datos.cotizar,
    paraActividad: datos.paraActividad,
    consultables: datos.consultables === null ? null : new Set(datos.consultables),
    ...paneles,
  }
}

// ¿Alguna fila de la página tiene algo en su «⋯»? Si no, la columna de acciones no se dibuja.
export function hayMenuEnLaPagina(filas: readonly Vehiculo[], para: ParaElMenuDeLaLista): boolean {
  const paraTodas = para.cotizar !== null || para.editaEnElOrigen || para.paraActividad !== null
  return (
    para.publicar.estado === 'habilitado' ||
    (paraTodas && filas.length > 0) ||
    filas.some((fila) => para.editables.has(fila.id) || para.eliminables.has(fila.id))
  )
}

// La fase de un vehículo entre las de su origen; null = sin fase (o una que ya no existe).
export function faseDe(fases: readonly FaseResumen[], faseId: string | null): FaseResumen | null {
  return fases.find((fase) => fase.id === faseId) ?? null
}

// El estado de una fila en la vitrina y, si está publicada y no se ve, por qué.
export function vitrinaDe(
  vehiculo: Vehiculo,
  vitrina: VitrinaDelOrigen,
): { estado: EstadoDeVitrina; motivos: MotivoDeNoVisible[] } {
  const estado = estadoDeVitrina(vehiculo, vitrina)
  return { estado, motivos: estado === 'no_visible' ? motivosDeNoVisible(vehiculo, vitrina) : [] }
}
