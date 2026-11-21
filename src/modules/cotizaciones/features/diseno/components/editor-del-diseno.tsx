'use client'

import { useMemo } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { Diseno } from '../../../entities/diseno'
import { apartesPosibles, totalesPosibles } from '../../../entities/diseno/edicion-de-la-tarjeta'
import { tiposDeCambio } from '../../../entities/diseno/edicion-de-la-cabecera'
import { tablasParaAyuda } from '../../../entities/diseno/edicion-de-items'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { useEdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { useEditorDelDiseno } from '../hooks/use-editor-del-diseno'
import { useVistaPreviaDelDiseno } from '../hooks/use-vista-previa-del-diseno'
import type { TonoDelCatalogo } from './aspecto'
import { AvisosDelDiseno } from './avisos-del-diseno'
import { BarraDeGuardado } from './barra-de-guardado'
import { CabeceraDelDiseno } from './cabecera-del-diseno'
import { EstadoDeLaHojaEnLaBarra } from './estado-de-la-hoja-en-la-barra'
import { PanelDeLaVistaPrevia } from './panel-de-la-vista-previa'
import { SeccionesDelDiseno } from './secciones-del-diseno'
import { TarjetaDelDiseno } from './tarjeta-del-diseno'

type Props = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  // Los tonos del catálogo, para pintar la vista previa y las muestras.
  tonos: readonly Tono[]
  // Sus claves y nombres para elegir el color de una sección o de la cabecera; nulo si no se pudo leer.
  catalogo: readonly TonoDelCatalogo[] | null
  recargando: boolean
  alRecargar: () => void
}

const CON_LA_VISTA_AL_COSTADO =
  'grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:[&>*:not([data-columna-de-la-vista-previa])]:col-start-1'

// El diseño de un origen en edición (4.22-2 y 4.22-3): «Guardar el borrador», el aviso y las secciones con sus ítems, que se ordenan arrastrando o con el
// teclado. Cada cambio se aplica en el acto y `validarDiseno()` lo revisa; mientras guarda, todo espera. Con la vista previa abierta y desde `xl`, la grilla
// pasa a dos columnas: lo demás en la primera (cinco filas, en el orden del DOM) y la vista previa en la segunda, a lo alto de las cinco.
export function EditorDelDiseno({
  origen,
  leida,
  disenoLeido,
  niveles,
  tonos,
  catalogo,
  recargando,
  alRecargar,
}: Props) {
  const claves = useMemo(() => catalogo?.map((t) => t.clave) ?? null, [catalogo])
  const editor = useEditorDelDiseno({
    origenId: origen.id,
    leida,
    disenoLeido,
    niveles,
    catalogo: claves,
  })
  const ediciones = useEdicionesDelDiseno(editor.aplicar, leida.definicion)
  const tablas = useMemo(() => tablasParaAyuda(leida.definicion), [leida.definicion])
  const totales = useMemo(() => totalesPosibles(leida.definicion), [leida.definicion])
  const apartes = useMemo(() => apartesPosibles(leida.definicion), [leida.definicion])
  const tipos = useMemo(() => tiposDeCambio(leida.definicion), [leida.definicion])
  const { rechazo, guardado } = editor
  const lugar = rechazo?.lugar ?? null
  const vista = useVistaPreviaDelDiseno()
  return (
    <div className={vista.abierta ? CON_LA_VISTA_AL_COSTADO : 'grid min-w-0 gap-3'}>
      <EstadoDeLaHojaEnLaBarra guardado={guardado} />
      <BarraDeGuardado
        nombreDelOrigen={origen.nombre}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        recargando={recargando}
        alGuardar={() => void guardado.guardar()}
        alRecargar={alRecargar}
      />
      <PanelDeLaVistaPrevia
        origen={origen}
        trabajo={editor.trabajo}
        leida={leida}
        tonos={tonos}
        vista={vista}
      />
      <AvisosDelDiseno rechazo={editor.rechazo} avisos={editor.avisos} />
      <CabeceraDelDiseno
        cabecera={editor.trabajo.cabecera}
        tieneTotalEn={leida.definicion.total_en !== undefined}
        nBuckets={Object.keys(leida.definicion.buckets ?? {}).length}
        tipos={tipos}
        ediciones={ediciones}
        ocupado={editor.ocupado}
        catalogo={catalogo}
        colores={tonos}
        error={
          lugar?.pieza === 'cabecera' && rechazo
            ? { clave: lugar.clave, mensaje: rechazo.mensaje }
            : null
        }
      />
      <SeccionesDelDiseno
        editor={editor}
        ediciones={ediciones}
        niveles={niveles}
        tablas={tablas}
        catalogo={catalogo}
        colores={tonos}
      />
      <TarjetaDelDiseno
        tarjeta={editor.trabajo.tarjeta_total}
        totales={totales}
        apartes={apartes}
        etiquetas={editor.nombresDeNodos}
        ediciones={ediciones}
        ocupado={editor.ocupado}
      />
    </div>
  )
}
