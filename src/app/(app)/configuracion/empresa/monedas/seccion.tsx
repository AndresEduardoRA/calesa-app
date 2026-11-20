import {
  leerAjustes,
  leerHistorial,
  leerLeyendaDeTiposCambio,
  leerMonedasYTiposCambio,
  leerUltimosCambios,
} from '@/modules/empresa'
import { MonedasYTiposCambio } from '@/modules/empresa/pantallas/configuracion-empresa'
import { datosO } from '@/shared/lib/errores'

type Props = {
  // `empresa.tipos_cambio.gestionar`: los tipos de cambio, las monedas y la leyenda.
  puedeGestionar: boolean
  // `empresa.ajustes.gestionar`: la moneda base.
  puedeEditarAjustes: boolean
  // El tipo de cambio de `?tc=`, si hay un panel abierto.
  tipoCambioAbierto: string | undefined
}

// Lo que dibuja Monedas y tipos de cambio. Los tipos de cambio los lee cualquiera; el historial y la edición, quien
// tiene `empresa.tipos_cambio.gestionar` (sin él se ve todo deshabilitado, con el motivo).
export async function SeccionMonedas({
  puedeGestionar,
  puedeEditarAjustes,
  tipoCambioAbierto,
}: Props) {
  const [monedasYTipos, paraEditar, leyenda, ultimos] = await Promise.all([
    leerMonedasYTiposCambio(),
    leerAjustes(),
    leerLeyendaDeTiposCambio(),
    leerUltimosCambios(),
  ])
  const { monedas, tipos } = datosO(monedasYTipos)
  const { ajustes, conDatosCargados } = datosO(paraEditar)
  // Falla en vez de dar una leyenda vacía: se guardaría encima de la verdadera.
  const leyendaDeTiposCambio = datosO(leyenda)
  // Sólo el de un tipo de cambio que existe: lo que viene en la URL lo puede escribir cualquiera.
  const abierto = tipos.find((tipo) => tipo.id === tipoCambioAbierto)
  const historial = abierto && puedeGestionar ? datosO(await leerHistorial(abierto.id)) : null

  return (
    <MonedasYTiposCambio
      tipos={tipos}
      monedas={monedas}
      ajustes={ajustes}
      conDatosCargados={conDatosCargados}
      historial={historial}
      // Sin quién y cuándo, la tarjeta dice sólo cuándo (la fila trae su fecha): no tumba la pantalla.
      ultimosCambios={ultimos.ok ? ultimos.data : {}}
      puedeGestionar={puedeGestionar}
      puedeEditarAjustes={puedeEditarAjustes}
      leyenda={leyendaDeTiposCambio}
    />
  )
}
