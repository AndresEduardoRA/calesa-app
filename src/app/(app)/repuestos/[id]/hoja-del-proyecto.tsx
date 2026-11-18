'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition, type ComponentProps, type ReactNode } from 'react'
import { useAlCambiarElDineroDelProyecto } from '@/modules/logistica/pantallas/dinero-proyecto'
import { BotonDelPanelDelItem, useItemPorUrl } from '@/modules/repuestos/pantallas/flujo'
import {
  PasoDelItem,
  PasosDelProyecto,
  useIndiceDelFlujo,
  type HitoDelSiguiente,
  type LecturaDeLosPasos,
  type IndiceDelFlujo,
  type PanelDelPaso as Panel,
} from '@/modules/repuestos/pantallas/flujo-pasos'
import { HojaDeItems, type HuecoDeLaHoja } from '@/modules/repuestos/pantallas/items'
import { BotonDeStock, PanelDeStock, useStockPorUrl } from '@/modules/repuestos/pantallas/stock'
import { Skeleton } from '@/shared/ui/skeleton'
import { PanelDelPaso } from './panel-del-paso'
import { usePanelDelPaso } from './use-panel-del-paso'

type Props = Omit<ComponentProps<typeof HojaDeItems>, 'hueco' | 'ordenDeLasFases'> & {
  lectura: LecturaDeLosPasos
  // Si hay un pago vivo; nulo sin `repuestos.costos.ver`.
  pago: boolean | null
  disponibles: readonly Panel[]
  // El panel que dibujó el servidor y cuál es (puede quedar atrás del de la URL mientras llega la página).
  panelDelServidor: { panel: Panel; contenido: ReactNode } | null
  titulos: Readonly<Record<Panel, string>>
  // Lo calcula el servidor con `puede()`; la base vuelve a exigirlo.
  puede: { mover: boolean; cotizar: boolean; registrarPago: boolean; configurar: boolean }
}

type PropsDeArriba = Pick<Props, 'lectura' | 'pago' | 'disponibles' | 'titulos' | 'hayMas'> & {
  indice: IndiceDelFlujo | null
  filas: ComponentProps<typeof PasosDelProyecto>['filas']
  paso: ReturnType<typeof usePanelDelPaso>
  contenido: ReactNode
  puedeConfigurar: boolean
}

// Lo que va arriba de la hoja: los pasos del proyecto y, debajo, el panel del paso abierto.
function ArribaDeLaHoja({ indice, lectura, paso, titulos, contenido, ...props }: PropsDeArriba) {
  const router = useRouter()
  return (
    <>
      <PasosDelProyecto
        indice={indice}
        estado={lectura.estado}
        filas={props.filas}
        hayMas={props.hayMas}
        pago={props.pago}
        disponibles={props.disponibles}
        abierto={paso.abierto}
        alElegirPanel={paso.elegir}
        puedeConfigurar={props.puedeConfigurar}
        alReintentar={() => {
          router.refresh()
        }}
      />
      {paso.abierto === null ? null : (
        <PanelDelPaso
          titulo={titulos[paso.abierto]}
          enfocar={paso.enfocar}
          alEnfocar={paso.yaEnfocado}
          alCerrar={() => {
            paso.elegir(null)
          }}
        >
          {contenido}
        </PanelDelPaso>
      )}
    </>
  )
}

// La hoja del proyecto con todo lo que otras áreas ponen en su hueco (un área no importa otra, y una función no cruza de un Server Component a uno de cliente): arriba,
// los pasos del proyecto y el panel del paso abierto; el orden de las fases, para agrupar la hoja por paso; en cada fila, el botón de su siguiente, «Stock» y «Abrir panel»; y el panel del stock. Cuando cambia el dinero del
// proyecto (un pago), vuelve a pedir la página para que los pasos y los botones digan si ya hay pago; mientras tanto, los botones del siguiente se apagan.
export function HojaDelProyecto({
  lectura,
  pago,
  disponibles,
  panelDelServidor,
  titulos,
  puede,
  ...hoja
}: Props) {
  const router = useRouter()
  const [refrescando, iniciar] = useTransition()
  useAlCambiarElDineroDelProyecto(hoja.proyectoId, () => {
    iniciar(() => {
      router.refresh()
    })
  })
  const indice = useIndiceDelFlujo(lectura)
  const stock = useStockPorUrl()
  const { abrir: abrirStock } = stock
  const { abrir: abrirItem } = useItemPorUrl()
  const paso = usePanelDelPaso(disponibles)
  const accionDeFila = useCallback<HuecoDeLaHoja['accionDeFila']>(
    (fila) => (
      <>
        <BotonDeStock fila={fila} alAbrir={abrirStock} />
        <BotonDelPanelDelItem fila={fila} alAbrir={abrirItem} />
      </>
    ),
    [abrirStock, abrirItem],
  )
  const contexto = { pago, cerrado: hoja.cerrado, puede }
  const alHito = (_: string, hito: HitoDelSiguiente) => {
    if (hito === 'pago') paso.registrarPago()
    else paso.abrirCotizaciones()
  }
  const contenido =
    paso.abierto !== null && panelDelServidor?.panel === paso.abierto ? (
      panelDelServidor.contenido
    ) : (
      <Skeleton className="h-24 w-full" />
    )
  return (
    <HojaDeItems
      {...hoja}
      ordenDeLasFases={indice?.lugar ?? null}
      hueco={{
        accionDeFila,
        panel: (api) => <PanelDeStock url={stock} api={api} />,
        arriba: (api) => (
          <ArribaDeLaHoja
            indice={indice}
            lectura={lectura}
            filas={api.filas}
            hayMas={hoja.hayMas}
            pago={pago}
            disponibles={disponibles}
            paso={paso}
            titulos={titulos}
            contenido={contenido}
            puedeConfigurar={puede.configurar}
          />
        ),
        pasoDeFila: (fila) =>
          indice === null ? null : (
            <PasoDelItem
              indice={indice}
              fila={fila}
              contexto={contexto}
              apagado={refrescando}
              alMover={abrirItem}
              alHito={alHito}
            />
          ),
      }}
    />
  )
}
