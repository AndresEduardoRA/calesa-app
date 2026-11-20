'use client'

import { useState, type ComponentType } from 'react'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import type { PropsDelEditor } from '../../../../entities/plantilla/props-del-editor'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import { useEditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import { useGuardarLaPlantilla } from '../../hooks/use-guardar-la-plantilla'
import { useLienzoDelEditor } from '../../hooks/use-lienzo-del-editor'
import { AvisosDelEditor } from '../avisos-del-editor'
import { BotonesDeLaPlantilla } from '../botones-de-la-plantilla'
import { EncabezadoDelEditor } from '../encabezado-del-editor'
import { PanelDelEditor } from './panel/panel-del-editor'
import { ZonaDelLienzo } from './zona-del-lienzo'

export type PropsDelEditorDeLaCuadricula = PropsDelEditor & {
  referencia: ReferenciaDeLaTarjeta
  // `?referencia=ejemplo`: las cifras de ejemplo aunque haya cotización.
  ejemplo: boolean
  alElegirReferencia: (ejemplo: boolean) => void
  // El hueco del lienzo, que llena el área `tarjeta`.
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  // Un rechazo de publicar con su lugar («Ir a la celda»): se elige en el lienzo.
  irA: { donde: string; vez: number } | null
  // Entró el guardado: la versión nueva (la pestaña no remonta el editor cuando llega).
  alGuardar: (esperada: string) => void
  alPublicar: () => void
  alDescartar: () => void
  // `empresa.ajustes.gestionar`: el aviso del logo que no se dibuja abre Empresa.
  puedeCambiarElLogo: boolean
}

// El logo de la referencia que no cargó: se avisa mientras el lienzo dibuja esa misma URL (con las cifras de ejemplo no hay imagen).
function useLogoRoto(referencia: PropsDelEditorDeLaCuadricula['referencia'], ejemplo: boolean) {
  const url = referenciaUsada(referencia, ejemplo)?.contexto.logo?.url ?? null
  const [rota, setRota] = useState<string | null>(null)
  return { roto: url !== null && rota === url, alFallar: () => setRota(url) }
}

// Lo que el editor anuncia al lector de pantalla; la misma frase dos veces seguidas se distingue con un espacio de ancho cero.
function AnuncioDelEditor({ anuncio }: { anuncio: { texto: string; vez: number } }) {
  return (
    <p role="status" className="sr-only" data-anuncio-del-editor="">
      {anuncio.texto}
      {anuncio.vez % 2 === 1 ? '​' : ''}
    </p>
  )
}

// El editor de la tarjeta como Excel: el encabezado con las versiones, los avisos, la barra y el lienzo (la tarjeta a escala, dibujada por el área `tarjeta`, con la capa
// del editor encima) y el panel a la derecha (debajo con el texto al 200 %). Escribe sólo la forma 2. Nace de la cuadrícula que le arma el servidor; guardar no lo
// remonta (sigue el historial) y una versión ajena sí (`key` de la pestaña).
export function EditorDeLaCuadricula(props: PropsDelEditorDeLaCuadricula) {
  const { origen, esperada, contexto, tonos, inicial, guardada } = props
  const editor = useEditorDeLaCuadricula({
    origenId: origen.id,
    esperada,
    inicial,
    guardada,
    contexto,
  })
  const guardar = useGuardarLaPlantilla({
    origenId: origen.id,
    formulaDelOrigenId: props.formulaDelOrigenId,
    esperada,
    plantilla: editor.plantilla,
    puedeGuardar: editor.puedeGuardar,
    limpiarBorrador: editor.limpiar,
    alGuardar: props.alGuardar,
  })
  const lienzo = useLienzoDelEditor({ editor, contexto, tonos, irA: props.irA })
  const logo = useLogoRoto(props.referencia, props.ejemplo)
  return (
    <section
      aria-label="Editor de la tarjeta"
      className="@container/editor grid min-w-0 gap-4"
      data-editor-de-la-tarjeta=""
    >
      <EncabezadoDelEditor
        origen={origen}
        de={props.de}
        esperada={esperada}
        publicada={props.publicada}
        acciones={
          <BotonesDeLaPlantilla
            esperada={esperada}
            hayCambios={editor.hayCambios}
            ocupado={guardar.ocupado || guardar.conflicto !== null}
            guardar={{
              puede: editor.puedeGuardar,
              motivo: editor.motivoParaNoGuardar,
              enCurso: guardar.enCurso,
              alGuardar: () => void guardar.enviar(),
            }}
            alPublicar={props.alPublicar}
            alDescartar={props.alDescartar}
          />
        }
      />
      <AvisosDelEditor
        deLaLectura={[...props.avisos, ...Object.values(guardar.porCampo)]}
        paraPublicar={editor.rechazoParaPublicar?.mensaje ?? null}
        guardar={guardar}
        hrefVer={rutaDeConfiguracionDeCotizacion(origen.id, 'tarjeta')}
        logoRoto={logo.roto}
        puedeCambiarElLogo={props.puedeCambiarElLogo}
      />
      <div className="grid min-w-0 gap-4 @[56rem]/editor:grid-cols-[minmax(0,1fr)_20rem]">
        <ZonaDelLienzo
          editor={editor}
          lienzo={lienzo}
          ocupado={guardar.ocupado}
          origen={origen.nombre}
          referencia={props.referencia}
          ejemplo={props.ejemplo}
          alElegirReferencia={props.alElegirReferencia}
          Lienzo={props.Lienzo}
          alFallarElLogo={logo.alFallar}
        />
        <PanelDelEditor
          editor={editor}
          contexto={contexto}
          tonos={tonos}
          nombrados={lienzo.nombrados}
          ocupado={guardar.ocupado}
          enfoque={lienzo.enfoque}
        />
      </div>
      <AnuncioDelEditor anuncio={editor.estado.anuncio} />
    </section>
  )
}
