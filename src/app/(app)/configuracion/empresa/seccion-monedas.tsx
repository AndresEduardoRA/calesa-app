import {
  leerAjustes,
  leerHistorial,
  leerLeyendaDeTiposCambio,
  leerMonedasYTiposCambio,
} from '@/modules/empresa'
import { MonedasYTiposCambio } from '@/modules/empresa/pantallas/configuracion-empresa'
import { datosO } from '@/shared/lib/errores'

type Props = {
  puedeGestionar: boolean
  // El tipo de cambio de `?tc=`, si hay un panel abierto.
  tipoCambioAbierto: string | undefined
}

// La pestaña «Monedas». Los tipos de cambio los lee cualquiera; el historial y la edición, quien
// tiene `empresa.tipos_cambio.gestionar` (sin él se ve todo deshabilitado, con el motivo).
export async function SeccionMonedas({ puedeGestionar, tipoCambioAbierto }: Props) {
  const [monedasYTipos, paraEditar, leyenda] = await Promise.all([
    leerMonedasYTiposCambio(),
    leerAjustes(),
    leerLeyendaDeTiposCambio(),
  ])
  const { monedas, tipos } = datosO(monedasYTipos)
  const { ajustes } = datosO(paraEditar)
  // Falla en vez de dar una leyenda vacía: se guardaría encima de la verdadera.
  const leyendaDeTiposCambio = datosO(leyenda)
  // Sólo el de un tipo de cambio que existe: lo que viene en la URL lo puede escribir cualquiera.
  const abierto = tipos.find((tipo) => tipo.id === tipoCambioAbierto)
  const historial = abierto && puedeGestionar ? datosO(await leerHistorial(abierto.id)) : null

  return (
    <MonedasYTiposCambio
      tipos={tipos}
      monedas={monedas}
      monedaBase={ajustes.monedaBase}
      historial={historial}
      puedeGestionar={puedeGestionar}
      leyenda={leyendaDeTiposCambio}
    />
  )
}
