'use client'

import { cn } from 'cn'
import {
  AbrirResumen,
  CeldaPegada,
  CabeceraPegada,
  FilaDeLista,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
} from '@/shared/ui/lista'
import { TableBody, TableHeader, TableRow } from '@/shared/ui/table'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { HuecosDelFlujo } from './huecos'
import { InsigniaDeRevisar, MarcasDeLaFase, NombreConColor } from './marcas-de-la-fase'

type PropsDeVista = {
  flujo: FlujoParaConfigurar
  huecos: HuecosDelFlujo
  alAbrir: (faseId: string) => void
}

function Nombre({ fase }: { fase: FaseParaConfigurar }) {
  return (
    <AbrirResumen
      nombre={fase.nombre}
      className={cn('max-w-72 min-w-0', !fase.activa && 'opacity-70')}
    >
      <NombreConColor fase={fase} />
    </AbrirResumen>
  )
}

// Las marcas, los avisos de «Revisar», los huecos de salidas y el «⋯» de la fila: lo que llena cada paso. Sin hueco, nada.
function Extras({
  flujo,
  fase,
  huecos,
}: Omit<PropsDeVista, 'alAbrir'> & { fase: FaseParaConfigurar }) {
  const Salidas = huecos.salidasDeFila
  return (
    <>
      <MarcasDeLaFase fase={fase} />
      <InsigniaDeRevisar faseId={fase.id} />
      {Salidas ? <Salidas flujo={flujo} fase={fase} /> : null}
    </>
  )
}

function Tabla({ flujo, huecos, alAbrir }: PropsDeVista) {
  const Acciones = huecos.accionesDeFila
  return (
    <TablaDeLista className="@container">
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Fase</CabeceraPegada>
          {Acciones ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {flujo.fases.map((fase) => (
          <FilaDeLista
            key={fase.id}
            alAbrir={() => {
              alAbrir(fase.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Nombre fase={fase} />
                <Extras flujo={flujo} fase={fase} huecos={huecos} />
              </span>
            </CeldaPegada>
            {Acciones ? (
              <CeldaPegada lado="acciones">
                <Acciones flujo={flujo} fase={fase} />
              </CeldaPegada>
            ) : null}
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ flujo, huecos, alAbrir }: PropsDeVista) {
  const Acciones = huecos.accionesDeFila
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {flujo.fases.map((fase) => (
        <TarjetaDeLista
          key={fase.id}
          alAbrir={() => {
            alAbrir(fase.id)
          }}
          acciones={Acciones ? <Acciones flujo={flujo} fase={fase} /> : undefined}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Nombre fase={fase} />
            <Extras flujo={flujo} fase={fase} huecos={huecos} />
          </div>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// Las fases del flujo en el orden de la base, como lista (la versión navegable del diagrama, y la única en el celular): el nombre con su color, sus marcas,
// los avisos de «Revisar» y las salidas. Un clic en la fila o Enter en el nombre abre el panel de la fase. Los huecos los llenan 5.04 (acciones) y 5.06 (salidas).
export function ListaDeFases({ flujo, huecos, alAbrir }: PropsDeVista) {
  return (
    <div className="max-w-3xl min-w-0">
      <UnaSolaVista
        tabla={() => <Tabla flujo={flujo} huecos={huecos} alAbrir={alAbrir} />}
        tarjetas={() => <Tarjetas flujo={flujo} huecos={huecos} alAbrir={alAbrir} />}
      />
    </div>
  )
}
