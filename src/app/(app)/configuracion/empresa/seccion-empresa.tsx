import { leerAjustes, leerMonedasYTiposCambio, urlDeIcono, zonasHorarias } from '@/modules/empresa'
import { TarjetasDeLaEmpresa } from '@/modules/empresa/pantallas/configuracion-empresa'
import { urlPublica, urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'

// Lo que dibuja Datos de la empresa: cinco tarjetas con lo guardado, que se editan en un modal cada una. La lee cualquiera que llegue a la
// pantalla; quien no tiene `empresa.ajustes.gestionar` la ve con «Editar» apagado y el motivo. Sin `key`: las tarjetas y sus modales
// reciben lo guardado por props y cada modal arranca de cero en cada apertura.
export async function SeccionEmpresa({ puedeEditar }: { puedeEditar: boolean }) {
  const [paraEditar, monedasYTipos] = await Promise.all([leerAjustes(), leerMonedasYTiposCambio()])
  const { ajustes, conDatosCargados } = datosO(paraEditar)
  const { monedas } = datosO(monedasYTipos)

  return (
    <TarjetasDeLaEmpresa
      ajustes={ajustes}
      logoUrl={urlPublicaONull('marca', ajustes.logoRuta)}
      logoOscuroUrl={urlPublicaONull('marca', ajustes.logoOscuroRuta)}
      iconoActualUrl={urlDeIcono(ajustes.iconos, '192', (ruta) => urlPublica('marca', ruta))}
      monedas={monedas.filter((moneda) => moneda.activa || moneda.codigo === ajustes.monedaBase)}
      zonas={zonasHorarias()}
      conDatosCargados={conDatosCargados}
      puedeEditar={puedeEditar}
    />
  )
}
