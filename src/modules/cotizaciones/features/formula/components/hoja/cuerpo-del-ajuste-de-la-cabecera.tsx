'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Checkbox } from '@/shared/ui/checkbox'
import { EstadoError } from '@/shared/ui/estados'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { nombreDelModo, ofreceVerTotalBs } from '../../../../entities/cabecera-de-la-hoja'
import { AVISO_DE_LA_CABECERA, noAplicar } from '../../../../entities/cabecera-por-defecto'
import type { PropsDelAjusteDeLaCabecera } from '../../../hoja/components/huecos'
import { CamposPorDefectoDeLaCabecera } from '../../../hoja/components/por-defecto/campos-por-defecto-de-la-cabecera'
import {
  useAjusteDeLaCabecera,
  type AjusteDeLaCabecera,
} from '../../hooks/use-ajuste-de-la-cabecera'
import { EsqueletoDelValor } from './esqueleto-del-valor'

type Props = Omit<PropsDelAjusteDeLaCabecera, 'abierto'> & { origenId: string }

// El aviso de un envío con su salida: «Volver a leer» tras un PT409, «Reintentar» sin red o con un error.
function AvisoDelEnvio({ ajuste }: { ajuste: AjusteDeLaCabecera }) {
  const { aviso } = ajuste
  if (aviso === null) {
    return null
  }
  return (
    <Aviso tono={aviso.salida === null ? 'aviso' : 'peligro'}>
      <p>{aviso.mensaje}</p>
      {aviso.salida === null ? null : (
        <Button
          variant="outline"
          className="mt-2 min-h-11 md:min-h-8"
          disabled={ajuste.enCurso}
          onClick={
            aviso.salida === 'volver_a_leer' ? ajuste.volverALeer : () => void ajuste.enviar()
          }
        >
          {aviso.salida === 'volver_a_leer' ? 'Volver a leer' : 'Reintentar'}
        </Button>
      )}
    </Aviso>
  )
}

// «Aplicar también a esta cotización»: marcada por defecto; apagada con su motivo si no se puede (sólo lectura, o la versión de la hoja no tiene el modo).
function AplicarALaHoja({ ajuste, hoja }: { ajuste: AjusteDeLaCabecera; hoja: Props['hoja'] }) {
  const ayuda = useId()
  const { aplicable } = ajuste
  if (aplicable === null) {
    return null
  }
  const actual = nombreDelModo(hoja.cabecera, hoja.modoElegido)
  const texto = !aplicable.puede ? aplicable.motivo : actual === null ? null : noAplicar(actual)
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:pointer-fine:min-h-8">
        <Checkbox
          checked={aplicable.puede && ajuste.aplicar}
          disabled={!aplicable.puede || ajuste.enCurso}
          aria-describedby={texto === null ? undefined : ayuda}
          onCheckedChange={ajuste.marcarAplicar}
        />
        Aplicar también a esta cotización
      </label>
      {texto === null ? null : (
        <p id={ayuda} className="text-(length:--text-xs) text-(--color-ink-soft)">
          {texto}
        </p>
      )}
    </div>
  )
}

// Lo de adentro del panel del ⚙ de la cabecera: el aviso de V1, los campos «Por defecto» (los del núcleo, los mismos del diseño), «Aplicar también a esta cotización» y
// el pie con «Cancelar» · «Guardar por defecto». No muestra cifras.
export function CuerpoDelAjusteDeLaCabecera({ origenId, origen, cerrar, hoja }: Props) {
  const ajuste = useAjusteDeLaCabecera({ origenId, origen, cerrar, hoja })
  useCambiosSinGuardar(ajuste.hayCambios, undefined, { preguntaAlCerrar: true })
  const formulario = useId()
  const { lectura, valor } = ajuste
  if (lectura.tipo === 'error') {
    return (
      <div role="alert">
        <EstadoError titulo={lectura.mensaje} alReintentar={ajuste.reintentarLectura} />
      </div>
    )
  }
  if (lectura.tipo === 'sin_publicada') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{lectura.mensaje}</p>
  }
  return (
    <form
      id={formulario}
      className="grid gap-6"
      onSubmit={(evento) => {
        evento.preventDefault()
        void ajuste.enviar()
      }}
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {AVISO_DE_LA_CABECERA(origen)}
      </p>
      <AvisoDelEnvio ajuste={ajuste} />
      {lectura.tipo === 'leyendo' || valor === null ? (
        <EsqueletoDelValor letrero="Cargando la configuración por defecto" />
      ) : (
        <>
          <CamposPorDefectoDeLaCabecera
            modos={lectura.modos}
            valor={valor}
            alCambiar={ajuste.elegir}
            ofreceVerTotalBs={lectura.verTotalBs && ofreceVerTotalBs(hoja.cabecera)}
            moneda={hoja.cabecera.monedaBs}
            deshabilitado={ajuste.enCurso}
          />
          <AplicarALaHoja ajuste={ajuste} hoja={hoja} />
        </>
      )}
      <PieDelPanel
        idFormulario={formulario}
        enCurso={ajuste.enCurso}
        alCancelar={cerrar}
        etiquetaDeGuardar="Guardar por defecto"
        sinPuedeEnviar={lectura.tipo !== 'listo' || ajuste.aviso?.salida === 'volver_a_leer'}
      />
    </form>
  )
}
