'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useLive } from '@/shared/ui/live'
import { BOTON_DEL_VALOR, ENTRADA } from '@/shared/ui/xcell'
import {
  useEdicionDeCelda,
  type Confirmacion,
  type Lectura,
} from '../../hooks/use-edicion-de-celda'
import { MARCAS_DE_GESTORES } from '../hoja/marcas-de-gestores'

// La caja de una celda editable, como la XCell editable: borde y fondo del color de su banda (`--tono-*`; sin color, los tokens neutros, que pasan AA).
export const CAJA_EDITABLE =
  'inline-flex max-w-full flex-col items-end rounded-md border border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface))]'

type Props<T> = {
  // El concepto de la fila: el nombre accesible es «<concepto>, valor» (sin montos en `aria-label`).
  concepto: string
  // Lo que muestra el botón (el dinero por `<Monto>`).
  contenido: ReactNode
  bloqueada: boolean
  // El motivo visible de por qué espera (uno para toda la tabla).
  idDelMotivo: string
  textoInicial: () => string
  leer: (texto: string) => Lectura<T>
  alConfirmar: (valor: T) => Confirmacion
}

// La entrada abierta: con el Modo Live, como una celda (contraseña y sin gestores). Sólo se monta al abrir.
function Entrada({
  concepto,
  valor,
  error,
  idDelError,
  alCambiar,
  alConfirmar,
  alCancelar,
}: {
  concepto: string
  valor: string
  error: string | null
  idDelError: string
  alCambiar: (texto: string) => void
  alConfirmar: (alSalir: boolean) => void
  alCancelar: () => void
}) {
  const { live } = useLive()
  const campo = useRef<HTMLInputElement>(null)
  // La entrada reemplaza al botón que tenía el foco: lo toma ella, con el valor elegido.
  useEffect(() => {
    campo.current?.focus()
    campo.current?.select()
  }, [])
  return (
    <input
      ref={campo}
      type={live ? 'password' : 'text'}
      {...(live ? MARCAS_DE_GESTORES : {})}
      autoComplete="off"
      inputMode="decimal"
      aria-label={`${concepto}, valor`}
      aria-invalid={error === null ? undefined : true}
      aria-describedby={error === null ? undefined : idDelError}
      className={ENTRADA}
      value={valor}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      onBlur={() => {
        alConfirmar(true)
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault()
          alConfirmar(false)
        } else if (evento.key === 'Escape') {
          evento.preventDefault()
          evento.stopPropagation()
          alCancelar()
        }
      }}
    />
  )
}

export function CajaEditable<T>(p: Props<T>) {
  const idDelError = useId()
  const { abierta, texto, error, boton, abrir, cambiar, confirmar, cancelar } =
    useEdicionDeCelda<T>({
      textoInicial: p.textoInicial,
      leer: p.leer,
      alConfirmar: p.alConfirmar,
      bloqueada: p.bloqueada,
    })
  const describe = [p.bloqueada ? p.idDelMotivo : null, error === null ? null : idDelError]
    .filter((x) => x !== null)
    .join(' ')
  return (
    <span data-editable="" className="inline-flex max-w-full flex-col items-end gap-1">
      <span className={CAJA_EDITABLE}>
        {abierta ? (
          <Entrada
            concepto={p.concepto}
            valor={texto}
            error={error}
            idDelError={idDelError}
            alCambiar={cambiar}
            alConfirmar={confirmar}
            alCancelar={cancelar}
          />
        ) : (
          <button
            ref={boton}
            type="button"
            className={BOTON_DEL_VALOR}
            aria-disabled={p.bloqueada ? true : undefined}
            data-invalido={error === null ? undefined : ''}
            aria-describedby={describe === '' ? undefined : describe}
            onClick={abrir}
          >
            <span className="sr-only">{p.concepto}, valor: </span>
            {p.contenido}
          </button>
        )}
      </span>
      {error === null ? null : (
        <span
          id={idDelError}
          role="alert"
          className="max-w-56 text-right text-(length:--text-xs) text-(--color-peligro-ink)"
        >
          {error}
        </span>
      )}
    </span>
  )
}
