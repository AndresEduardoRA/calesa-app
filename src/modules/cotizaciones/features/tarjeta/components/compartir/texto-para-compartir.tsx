'use client'

import { Textarea } from '@/shared/ui/textarea'
import type { DatosParaCompartir } from '../../../../entities/tarjeta/compartir/datos-para-compartir'
import {
  ETIQUETA_DEL_FORMATO,
  FORMATOS_DE_TEXTO,
  zonasDisponibles,
  type FormatoDeTexto,
  type ZonaParaCompartir,
} from '../../../../entities/tarjeta/compartir/texto-para-compartir'
import type { ParteDeCompartir } from '../../hooks/use-parte-de-compartir'
import { ErrorConReintentar } from './error-con-reintentar'
import { GrupoDeOpciones } from './grupo-de-opciones'

const FORMATOS = FORMATOS_DE_TEXTO.map((clave) => ({
  clave,
  etiqueta: ETIQUETA_DEL_FORMATO[clave],
}))

type Props = {
  datos: ParteDeCompartir<DatosParaCompartir>
  // El texto ya armado con el formato y la zona elegidos (nulo mientras no llegan los datos).
  texto: string | null
  formato: FormatoDeTexto
  zona: ZonaParaCompartir
  alElegirFormato: (formato: FormatoDeTexto) => void
  alElegirZona: (zona: ZonaParaCompartir) => void
  alReintentar: () => void
}

// La pestaña «Texto»: el formato («Simple», «WhatsApp», «Facebook», «TikTok») y la zona del cierre de la subasta (sólo con un patio conocido), y el texto tal como
// saldrá, de sólo lectura. Cambiar uno u otro arma el texto en el momento, sin pedir nada.
export function TextoParaCompartir(props: Props) {
  const { datos, texto, formato, zona, alElegirFormato, alElegirZona, alReintentar } = props
  if (datos.estado === 'error') {
    return (
      <ErrorConReintentar
        titulo="No se pudo armar el texto."
        mensaje={datos.error.mensaje}
        alReintentar={alReintentar}
      />
    )
  }
  const zonas = datos.estado === 'listo' ? zonasDisponibles(datos.dato) : []
  return (
    <div className="grid min-w-0 gap-3">
      <GrupoDeOpciones
        etiqueta="Formato del texto"
        opciones={FORMATOS}
        elegida={formato}
        alElegir={alElegirFormato}
      />
      {zonas.length > 1 ? (
        <GrupoDeOpciones
          etiqueta="Zona horaria de la subasta"
          opciones={zonas}
          elegida={zona}
          alElegir={alElegirZona}
        />
      ) : null}
      <label htmlFor="compartir-cotizacion-texto" className="sr-only">
        Texto
      </label>
      <Textarea
        id="compartir-cotizacion-texto"
        readOnly
        rows={12}
        aria-busy={texto === null}
        value={texto ?? 'Armando el texto…'}
        className="resize-none text-(length:--text-sm)"
      />
    </div>
  )
}
