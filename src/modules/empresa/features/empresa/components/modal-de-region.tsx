'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { LOCALES_SUGERIDOS } from '../../../entities/regional'
import { useGuardarTarjeta } from '../hooks/use-guardar-tarjeta'
import { CampoEscrito } from './campos-del-modal'
import { CONFLICTO_DE_AJUSTES, type PropsDeModalDeAjustes } from './modal-de-identidad'

type Props = PropsDeModalDeAjustes & {
  // Las zonas horarias que conoce el servidor, para sugerir mientras se tipea.
  zonas: readonly string[]
}

// «Región» (`?panel=region`): cómo se escriben los números, las fechas y los montos. Cada apertura empieza de lo guardado.
export function ModalDeRegion(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeRegion key={apertura} {...props} />
}

function FormularioDeRegion({ zonas, ...props }: Props) {
  const formulario = useGuardarTarjeta({ tarjeta: 'region', ...props })
  return (
    <ModalDeFormulario
      id="ajustes-region"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Región"
      descripcion="Cómo se escriben los números, las fechas y los montos."
      ancho="amplio"
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES}
    >
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <CampoEscrito
          formulario={formulario}
          campo="pais"
          etiqueta="País"
          autoComplete="country-name"
          maxLength={80}
        />
        <CampoEscrito
          formulario={formulario}
          campo="locale"
          etiqueta="Formato regional"
          list="locales-sugeridos"
          autoComplete="off"
          spellCheck={false}
          ayuda="Idioma y país, como es-BO: decide el separador de miles y el orden de la fecha."
        />
        <CampoEscrito
          formulario={formulario}
          campo="telefonoCc"
          etiqueta="Código de país de los teléfonos"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={4}
          ayuda="Se agrega a los teléfonos de los leads que se escriben sin «+» ni «00». Lleva un «+» y de 1 a 3 dígitos."
        />
        <CampoEscrito
          formulario={formulario}
          campo="zonaHoraria"
          etiqueta="Zona horaria"
          list="zonas-horarias"
          autoComplete="off"
          spellCheck={false}
          ayuda="Las fechas y las horas de toda la app se muestran en esta zona."
        />
      </div>
      <datalist id="locales-sugeridos">
        {LOCALES_SUGERIDOS.map((locale) => (
          <option key={locale} value={locale} />
        ))}
      </datalist>
      <datalist id="zonas-horarias">
        {zonas.map((zona) => (
          <option key={zona} value={zona} />
        ))}
      </datalist>
    </ModalDeFormulario>
  )
}
