import {
  AccionesDeFila,
  AccionesDeLaLista,
  AccionesDelPanel,
  DatosDeLaFase,
  ProveedorDeOrden,
  ReglasDeLaFase,
} from '@/modules/flujos/pantallas/fases'
import type { HuecosDelFlujo } from '@/modules/flujos/pantallas/configuracion'
import { BloqueDeRequisitos } from '@/modules/flujos/pantallas/requisitos'
import { FranjaDeRevisar, ProveedorDeRevisar } from '@/modules/flujos/pantallas/revisar'
import { BloqueDeSalidas, SalidasDeLaFila } from '@/modules/flujos/pantallas/transiciones'

// Lo que cada área de `flujos` pone en la pantalla de flujos (`HuecosDelFlujo`): «Revisar» (su lectura única y la franja), el orden de las fases, la barra,
// el «⋯» y las salidas de cada fila de la lista, y los bloques del panel de una fase. Son componentes de cliente.
export const HUECOS_DE_FLUJOS: HuecosDelFlujo = {
  proveedorDeRevisar: ProveedorDeRevisar,
  franjaDeRevisar: FranjaDeRevisar,
  ordenDeFases: ProveedorDeOrden,
  accionesDeLaLista: AccionesDeLaLista,
  accionesDeFila: AccionesDeFila,
  salidasDeFila: SalidasDeLaFila,
  bloques: {
    acciones: AccionesDelPanel,
    datos: DatosDeLaFase,
    requisitos: BloqueDeRequisitos,
    salidas: BloqueDeSalidas,
    reglas: ReglasDeLaFase,
  },
}
