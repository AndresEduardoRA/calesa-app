// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { Resultado } from '@/shared/lib/errores'
import type { AjustesDeCotizacion } from './ajustes-de-cotizacion'
import type { LeyendaDeTiposCambio, ParaCompartir } from './compartir-tipos-cambio'
import type { AjustesEmpresa, CambiosDeAjustes } from './ajustes-empresa'
import type { ClaveIntegracion, Integracion } from './integraciones'
import type { CambioDeValor, Moneda, TipoCambio } from './tipos-cambio'
import type { TipoCambioVigente, UltimoCambio } from './tipos-cambio-vigentes'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }

export type RepositorioEmpresa = {
  guardar: (pedido: {
    cambios: CambiosDeAjustes
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

// La vigencia de las cotizaciones, con la misma versión de la fila que el formulario de Empresa.
export type RepositorioAjustesDeCotizacion = {
  guardar: (pedido: {
    vigenciaDias: number
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

export type RepositorioTiposCambio = {
  crear: (nuevo: {
    clave: string
    nombre: string
    monedaDe: string
    monedaA: string
    valor: number
  }) => Promise<Resultado<{ id: string }>>
  // Lo que viene `undefined` no se toca.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    valor?: number
    activo?: boolean
    esDefault?: boolean
    enLaBarra?: boolean
  }) => Promise<Resultado<Editado>>
  crearMoneda: (nueva: {
    codigo: string
    nombre: string
    simbolo: string
    decimales: number
  }) => Promise<Resultado<Editado>>
  guardarMoneda: (pedido: {
    codigo: string
    actualizadoEnEsperado: string
    nombre?: string
    simbolo?: string
    decimales?: number
    activa?: boolean
  }) => Promise<Resultado<Editado>>
}

export type RepositorioIntegraciones = {
  guardar: (pedido: {
    clave: ClaveIntegracion
    actualizadoEnEsperado: string
    activa?: boolean
    config?: Record<string, unknown>
  }) => Promise<Resultado<Editado>>
  // Va a Vault. Nada lo devuelve: sólo queda dicho cuándo se guardó.
  guardarSecreto: (pedido: {
    clave: ClaveIntegracion
    secreto: string
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

// «Probar» de la web pública: un POST con la dirección y el secreto guardados. Vuelve sólo el
// código de respuesta; el secreto no sale del servidor.
export type ProbadorDeRevalidacion = () => Promise<Resultado<{ codigo: number; conHttps: boolean }>>

export type AjustesParaEditar = {
  ajustes: AjustesEmpresa
  // Con vehículos, cotizaciones o gastos cargados la moneda base ya no se cambia.
  conDatosCargados: boolean
}

export type MonedasYTiposCambio = { monedas: Moneda[]; tipos: TipoCambio[] }

export type LectorDeAjustes = () => Promise<Resultado<AjustesParaEditar>>
// Todos, también los inactivos: es lo que edita la pantalla.
export type LectorDeMonedasYTiposCambio = () => Promise<Resultado<MonedasYTiposCambio>>
// Cuándo y quién cambió por última vez el valor de cada tipo de cambio activo, por su id (el de los inactivos no se lee: la tarjeta dice sólo cuándo).
export type LectorDeUltimosCambios = () => Promise<Resultado<Record<string, UltimoCambio>>>
export type LectorDeHistorial = (tipoCambioId: string) => Promise<Resultado<CambioDeValor[]>>
// Los vigentes con su último cambio, para el popover de la barra: hasta TOPE_DEL_POPOVER + 1 (el de más dice que hay otros).
export type LectorDeTiposCambioVigentes = () => Promise<Resultado<TipoCambioVigente[]>>
export type LectorDeIntegraciones = () => Promise<Resultado<Integracion[]>>
// Cuántos vehículos publicados empiezan o dejan de verse al encender o apagar la web pública.
export type LectorDeVehiculosQueCambian = () => Promise<Resultado<ConteoAcotado>>
// La vigencia con la versión de la fila; falla en vez de dar los de fábrica.
export type LectorDeAjustesDeCotizacion = () => Promise<Resultado<AjustesDeCotizacion>>

// La leyenda de los tipos de cambio compartidos, con la misma versión de la fila que el formulario de Empresa.
export type RepositorioLeyendaDeTiposCambio = {
  guardar: (pedido: {
    leyenda: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}
// Falla en vez de dar una leyenda vacía: se guardaría encima de la verdadera.
export type LectorDeLeyendaDeTiposCambio = () => Promise<Resultado<LeyendaDeTiposCambio>>
// Lo que se comparte, de los tipos elegidos (los activos entre ellos, en el orden pedido) y de la empresa, con la sesión de quien pide.
export type LectorParaCompartir = (ids: readonly string[]) => Promise<Resultado<ParaCompartir>>
// La imagen PNG de lo que se comparte.
export type DibujanteDeImagen = (datos: ParaCompartir) => Promise<Resultado<Uint8Array>>
