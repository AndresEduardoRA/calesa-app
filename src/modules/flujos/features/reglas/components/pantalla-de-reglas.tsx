import { WorkflowIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFlujoParaConfigurar, leerFlujosConfigurables } from '../../../areas/nucleo/composicion'
import { leerCatalogoDeTransporte, leerOfertaDeTransporte } from '../../../areas/reglas/composicion'
import { reglaEncendida } from '../../../entities/reglas/catalogo'
import { motivoSinPermisoDeReglas } from '../../../entities/reglas/permiso'
import {
  armarSelector,
  elegirEntrada,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import { ConfiguracionDeReglas } from './configuracion-de-reglas'

type Props = {
  permisos: Permisos
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
  // `?origen=` y `?ambito=`: una URL que no es de los suyos abre el primero.
  origenPedido: string | undefined
  ambitoPedido: string | undefined
}

// Lo guardado y lo que se puede marcar: se leen juntos, y sólo con «Transporte» encendida.
async function leerTransporte(flujoId: string) {
  const [oferta, catalogo] = await Promise.all([
    leerOfertaDeTransporte(flujoId),
    leerCatalogoDeTransporte(),
  ])
  return { oferta: datosO(oferta), catalogo: datosO(catalogo) }
}

// Las reglas de Configuración › Flujos (5.11), en el panel del flujo (`?seccion=reglas`: sin selector, el flujo ya está elegido en la pantalla), leídas en
// el servidor con la sesión de quien mira y detrás de `<Suspense>`: el flujo elegido, sus reglas y, con «Transporte» encendida, su oferta y los puertos y
// navieras que se pueden marcar. La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function PantallaDeReglas({ permisos, origenes, origenPedido, ambitoPedido }: Props) {
  const [flujos, listaDeOrigenes] = await Promise.all([leerFlujosConfigurables(permisos), origenes])
  const entradas = armarSelector(datosO(flujos), datosO(listaDeOrigenes))
  const entrada = elegirEntrada(entradas, {
    origen: origenPedido ?? null,
    ambito: ambitoPedido ?? null,
  })
  if (!entrada) {
    return (
      <EstadoVacio Icono={WorkflowIcon} titulo="No hay flujos que puedas configurar." compacto />
    )
  }
  const flujo = datosO(await leerFlujoParaConfigurar(entrada.flujo.id))
  if (!flujo) {
    return <EstadoVacio Icono={WorkflowIcon} titulo="Este flujo ya no existe." compacto />
  }
  const transporte = reglaEncendida(flujo.reglas, 'transporte')
    ? await leerTransporte(flujo.id)
    : null
  return (
    <ConfiguracionDeReglas
      flujoId={flujo.id}
      claveDelFlujo={entrada.clave}
      ambito={flujo.ambito}
      version={flujo.version}
      reglas={flujo.reglas}
      motivoSinPermiso={motivoSinPermisoDeReglas(permisos, flujo.ambito, flujo.origenId)}
      transporte={transporte}
      // Sin puertos o navieras que ofrecer, quien gestiona esos catálogos ve el enlace a cargarlos.
      puedeCargarCatalogos={puede(permisos, 'logistica.catalogos.gestionar')}
    />
  )
}
