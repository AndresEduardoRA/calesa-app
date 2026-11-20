'use client'

import { Aviso } from '@/shared/ui/aviso'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { LeyendaDeTiposCambio } from '../../../entities/compartir-tipos-cambio'
import {
  MOTIVO_SIN_PERMISO_AJUSTES,
  MOTIVO_SIN_PERMISO_TIPOS_CAMBIO,
} from '../../../entities/motivos'
import {
  claveDelPar,
  gruposPorPar,
  type CambioDeValor,
  type GrupoDePar,
  type Moneda,
  type TipoCambio,
} from '../../../entities/tipos-cambio'
import type { UltimoCambio } from '../../../entities/tipos-cambio-vigentes'
import { useNavegacionDeMonedas } from '../hooks/use-navegacion-de-monedas'
import { usePanelesDeMonedas } from '../hooks/use-paneles-de-monedas'
import { useTiposCambio } from '../hooks/use-tipos-cambio'
import { ModalesDeMonedas } from './modales-de-monedas'
import { PANEL_MONEDA, PANEL_TIPO, PanelesDeMonedas } from './paneles-de-monedas'
import { ParesDeMonedas } from './pares-de-monedas'
import { TarjetaDeMonedaBase } from './tarjeta-de-moneda-base'
import { TarjetaAlCompartir, TarjetaDeMonedasActivas } from './tarjetas-secundarias'

type Props = {
  // Todos, también los inactivos.
  tipos: readonly TipoCambio[]
  monedas: readonly Moneda[]
  // Lo guardado de la empresa, con la versión de la fila: el modal de la moneda base lo recibe por props al abrir.
  ajustes: AjustesEmpresa
  // Con vehículos, cotizaciones o gastos cargados la base ya no se cambia.
  conDatosCargados: boolean
  // El historial del tipo de cambio de `?tc=`, ya leído en el servidor. null si no hay panel
  // abierto o si quien mira no puede verlo.
  historial: readonly CambioDeValor[] | null
  // Quién y cuándo cambió el valor de cada tipo de cambio activo.
  ultimosCambios: Readonly<Record<string, UltimoCambio>>
  // `empresa.tipos_cambio.gestionar`: los tipos de cambio, las monedas y la leyenda.
  puedeGestionar: boolean
  // `empresa.ajustes.gestionar`: la moneda base.
  puedeEditarAjustes: boolean
  // La leyenda de lo que se comparte, con la versión de la fila.
  leyenda: LeyendaDeTiposCambio
}

// Monedas y tipos de cambio: arriba la moneda base; debajo, un grupo por par de monedas (USD → BOB) con sus tipos de cambio como tarjetas; abajo, las
// monedas activas y la leyenda al compartir. Cada panel tiene su URL (`?tc=`, `?moneda=`, `?panel=`).
export function MonedasYTiposCambio(props: Props) {
  const { tipos, monedas, ajustes, puedeGestionar, leyenda } = props
  const monedaBase = ajustes.monedaBase
  const navegacion = useNavegacionDeMonedas()
  const ediciones = useTiposCambio()
  const modales = usePanelesDeMonedas({
    'moneda-base': props.puedeEditarAjustes ? null : MOTIVO_SIN_PERMISO_AJUSTES,
    monedas: puedeGestionar ? null : MOTIVO_SIN_PERMISO_TIPOS_CAMBIO,
    leyenda: puedeGestionar ? null : MOTIVO_SIN_PERMISO_TIPOS_CAMBIO,
  })
  const activas = monedas.filter((una) => una.activa)

  const crear = (de: GrupoDePar | null) =>
    navegacion.ir({ panel: PANEL_TIPO, par: de ? claveDelPar(de.monedaDe, de.monedaA) : undefined })
  const guardar = (tipo: TipoCambio, cambio: { esDefault: true } | { enLaBarra: boolean }) =>
    void ediciones.guardar(
      { id: tipo.id, actualizadoEnEsperado: tipo.actualizadoEn, ...cambio },
      tipo.nombre,
    )

  return (
    <div className="grid gap-6">
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_TIPOS_CAMBIO}</Aviso>}
      <TarjetasDeAjustes etiqueta="Moneda base">
        <TarjetaDeMonedaBase
          codigo={monedaBase}
          moneda={monedas.find((una) => una.codigo === monedaBase) ?? null}
          conDatosCargados={props.conDatosCargados}
          puedeEditar={props.puedeEditarAjustes}
          alCambiar={modales.base.abrir}
        />
      </TarjetasDeAjustes>
      <ParesDeMonedas
        grupos={gruposPorPar(tipos, monedaBase)}
        tipos={tipos}
        ultimosCambios={props.ultimosCambios}
        puedeGestionar={puedeGestionar}
        puedeSumar={puedeGestionar && activas.length >= 2}
        enCurso={ediciones.enCurso}
        alAbrir={(id) => {
          navegacion.ir({ tc: id })
        }}
        alCrear={crear}
        alGuardar={guardar}
      />
      <TarjetasDeAjustes etiqueta="Monedas y leyenda">
        <TarjetaDeMonedasActivas
          monedas={activas}
          monedaBase={monedaBase}
          puedeGestionar={puedeGestionar}
          alGestionar={modales.monedas.abrir}
          alCrear={() => {
            navegacion.ir({ panel: PANEL_MONEDA })
          }}
        />
        <TarjetaAlCompartir
          leyenda={leyenda}
          puedeGestionar={puedeGestionar}
          alEditar={modales.leyenda.abrir}
        />
      </TarjetasDeAjustes>
      <ModalesDeMonedas
        modales={modales}
        ajustes={ajustes}
        monedas={monedas}
        conDatosCargados={props.conDatosCargados}
        leyenda={leyenda}
        ir={navegacion.ir}
      />
      <PanelesDeMonedas
        navegacion={navegacion}
        tipos={tipos}
        monedas={monedas}
        activas={activas}
        monedaBase={monedaBase}
        historial={props.historial}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
      />
    </div>
  )
}
