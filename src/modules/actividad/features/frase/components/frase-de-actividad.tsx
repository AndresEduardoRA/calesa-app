import type { Route } from 'next'
import Link from 'next/link'
import type { FraseDeActividad as Frase } from '../../../entities/frase'
import { ValorDelCambio } from '../../diff/components/valor-del-cambio'

type Props = { frase: Frase; zona: string }

// Un cambio dicho como frase: «**Ana** cambió **Precio** de [Toyota Hilux #12]: 10.000 → 12.000». El registro enlaza a su página si existe y
// se ve; los montos van por `<Monto>`. Sin hooks: la dibujan la lista de `/actividad` y la «Actividad reciente», que va en el servidor. En el
// celular se parte en renglones sin desbordar.
export function FraseDeActividad({ frase, zona }: Props) {
  const { campo, registro, cambio } = frase
  return (
    <p className="min-w-0 [overflow-wrap:anywhere] text-(--color-ink)">
      <span className="font-medium">{frase.persona}</span> {frase.predicado}
      {campo ? (
        <>
          {' '}
          <span className="font-medium">{campo.etiqueta}</span>
          {campo.otros ? ` y ${campo.otros} más` : ''} de
        </>
      ) : null}{' '}
      {registro.prefijo ? `${registro.prefijo} de ` : ''}
      {registro.enlace ? (
        <Link
          href={registro.enlace as Route}
          className="font-medium text-(--color-primario-ink) underline decoration-(--color-line-strong) underline-offset-2 hover:decoration-current"
        >
          {registro.texto}
        </Link>
      ) : (
        <span>{registro.texto}</span>
      )}
      {frase.oculta ? ' que no puedes ver' : null}
      {cambio ? (
        <>
          :{' '}
          <span className="text-(--color-ink-soft)">
            <ValorDelCambio valor={cambio.antes} zona={zona} />
          </span>{' '}
          →{' '}
          <span className="font-medium">
            <ValorDelCambio valor={cambio.despues} zona={zona} />
          </span>
        </>
      ) : null}
    </p>
  )
}
