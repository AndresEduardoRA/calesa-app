'use client'

import { CopyIcon, DownloadIcon, FileDownIcon, ImageIcon, Share2Icon } from 'lucide-react'
import {
  compartirConElSistema,
  copiarImagen,
  copiarTexto,
  descargarArchivo,
  pngDesde,
  type Capacidades,
} from '@/shared/lib/compartir'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  conMenuDelSistema,
  type MotivosDeCompartir,
  type OpcionDeImagen,
} from '../../../../entities/tarjeta/compartir/motivos-de-compartir'
import type { FotoBajada } from '../../hooks/use-fotos-marcadas'
import type { PortadaParaCompartir } from '../../hooks/use-para-compartir-la-cotizacion'
import { useDescargaDelPdf } from '../../hooks/use-descarga-del-pdf'
import { textoDelFallo } from '../descargar-pdf-de-la-tarjeta'

type Props = {
  cotizacionId: string
  numero: number
  capacidades: Capacidades
  motivos: MotivosDeCompartir
  opcion: OpcionDeImagen
  // Lo que ya está en memoria: el texto, la portada (con su PNG) y las fotos marcadas y bajadas.
  texto: string | null
  portada: PortadaParaCompartir | null
  portadaFallida: boolean
  fotos: readonly FotoBajada[]
}

const ID_DE_MOTIVOS = 'compartir-cotizacion-motivos'
const FALLO = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO } as const

const extensionDe = (blob: Blob) =>
  blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'

// Los archivos de lo que se comparte, con el nombre que lleva cada uno: la portada en PNG o las fotos como están guardadas.
function archivosDe(props: Props): File[] {
  if (props.opcion === 'cotizacion') {
    return props.portada === null
      ? []
      : [
          new File([props.portada.png], `cotizacion-${String(props.numero)}.png`, {
            type: 'image/png',
          }),
        ]
  }
  return props.fotos.map(
    ({ blob, numero }) =>
      new File([blob], `${String(props.numero)}-foto-${String(numero)}.${extensionDe(blob)}`, {
        type: blob.type,
      }),
  )
}

function Accion(props: {
  motivo: string | null
  etiqueta: string
  Icono: typeof CopyIcon
  principal?: boolean
  // Apagado sin motivo que decir (mientras baja el PDF: el botón ya dice «Descargando…»).
  ocupado?: boolean
  alHacer: () => void
}) {
  const { motivo, etiqueta, Icono, principal = false, ocupado = false, alHacer } = props
  return (
    <Button
      type="button"
      variant={principal ? 'default' : 'outline'}
      className="min-h-11 min-w-[10rem] flex-1 md:min-h-8"
      disabled={motivo !== null || ocupado}
      aria-describedby={motivo === null ? undefined : ID_DE_MOTIVOS}
      onClick={alHacer}
    >
      <Icono aria-hidden />
      {etiqueta}
    </Button>
  )
}

async function hacer(accion: () => Promise<void>, hecho: string) {
  try {
    await accion()
    avisarExito(hecho)
  } catch {
    avisarError(FALLO)
  }
}

// El menú del sistema con el texto y los archivos, sin esperar nada antes (Safari pierde el gesto). Si el gesto ya venció, se pide tocar otra vez.
async function compartir(props: Props) {
  const { texto } = props
  if (texto === null) return
  try {
    const hecho = await compartirConElSistema(texto, archivosDe(props))
    if (hecho !== null && props.opcion === 'cotizacion' && props.portadaFallida) {
      avisar('Se compartió el texto. La imagen no se pudo armar.')
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      avisar('Vuelve a tocar «Compartir».')
      return
    }
    avisarError(FALLO)
  }
}

function copiarLaImagen(props: Props) {
  const imagen =
    props.opcion === 'cotizacion' ? (props.portada?.png ?? null) : (props.fotos[0]?.blob ?? null)
  if (imagen !== null) {
    void hacer(() => copiarImagen(pngDesde(imagen)), 'Imagen copiada')
  }
}

function descargarLaImagen(props: Props) {
  for (const archivo of archivosDe(props)) {
    descargarArchivo(archivo, archivo.name)
  }
}

// El pie de «Compartir la cotización»: en el celular con el menú del sistema, «Compartir» (principal), «Copiar texto» y «Descargar PDF», en columna a lo ancho; en el
// escritorio, «Copiar imagen», «Descargar imagen», «Copiar texto» y «Descargar PDF» en una fila que se parte. Lo que no se puede se apaga y dice su motivo debajo.
export function AccionesParaCompartir(props: Props) {
  const { cotizacionId, numero, capacidades, motivos, texto } = props
  const pdf = useDescargaDelPdf(cotizacionId, numero)
  const delSistema = conMenuDelSistema(capacidades)
  return (
    <div className="grid w-full min-w-0 gap-2">
      <div className={delSistema ? 'grid gap-2' : 'flex flex-wrap gap-2'}>
        {delSistema ? (
          <Accion
            principal
            motivo={motivos.compartir}
            etiqueta="Compartir"
            Icono={Share2Icon}
            alHacer={() => void compartir(props)}
          />
        ) : (
          <>
            <Accion
              motivo={motivos.copiarImagen}
              etiqueta="Copiar imagen"
              Icono={ImageIcon}
              alHacer={() => {
                copiarLaImagen(props)
              }}
            />
            <Accion
              motivo={motivos.descargarImagen}
              etiqueta="Descargar imagen"
              Icono={DownloadIcon}
              alHacer={() => {
                descargarLaImagen(props)
              }}
            />
          </>
        )}
        <Accion
          motivo={motivos.copiarTexto}
          etiqueta="Copiar texto"
          Icono={CopyIcon}
          alHacer={() => {
            if (texto !== null) void hacer(() => copiarTexto(texto), 'Texto copiado')
          }}
        />
        <Accion
          motivo={motivos.descargarPdf}
          ocupado={pdf.estado.tipo === 'bajando'}
          etiqueta={
            pdf.estado.tipo === 'bajando'
              ? 'Descargando…'
              : pdf.estado.tipo === 'fallo'
                ? 'Reintentar'
                : 'Descargar PDF'
          }
          Icono={FileDownIcon}
          alHacer={pdf.descargar}
        />
      </div>
      {pdf.estado.tipo === 'fallo' ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelFallo(pdf.estado.codigo)}
        </p>
      ) : null}
      {motivos.aLaVista.length > 0 ? (
        <p id={ID_DE_MOTIVOS} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivos.aLaVista.join(' ')}
        </p>
      ) : null}
    </div>
  )
}
