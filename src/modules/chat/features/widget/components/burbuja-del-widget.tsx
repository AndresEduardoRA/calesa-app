'use client'

import { MessageSquareIcon } from 'lucide-react'
import Link from 'next/link'
import { forwardRef } from 'react'
import { textoDeNoLeidos } from '../../../entities/conversaciones'

type Props = {
  noLeidos: number
  abierto: boolean
  alAlternar: () => void
}

const CLASE =
  'relative h-[44px] w-[44px] items-center justify-center rounded-full bg-(--color-primario) text-(--color-sobre-primario) shadow-(--shadow-md) outline-none hover:opacity-90 focus-visible:shadow-(--shadow-focus)'

function ContadorDeLaBurbuja({ noLeidos }: { noLeidos: number }) {
  const texto = textoDeNoLeidos(noLeidos)
  return texto ? (
    <span
      aria-hidden
      data-contador-del-chat=""
      className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--color-peligro) px-1 text-[10px] leading-none font-medium text-white tabular-nums"
    >
      {texto}
    </span>
  ) : null
}

function etiquetaDe(noLeidos: number): string {
  const texto = textoDeNoLeidos(noLeidos)
  return texto ? `Chat, ${noLeidos > 99 ? 'más de 99' : texto} sin leer` : 'Chat'
}

// La burbuja flotante: un botón que abre el panel desde 768 px y, en el celular (donde un panel taparía el pie y las listas), un enlace a `/chat`. El lugar (abajo a la derecha, por debajo de los
// modales y, en el celular, más arriba que el toaster) lo da `<Flotantes>` del marco, que la deja a la derecha de «Copiar el enlace».
export const BurbujaDelWidget = forwardRef<HTMLButtonElement, Props>(function BurbujaDelWidget(
  { noLeidos, abierto, alAlternar },
  ref,
) {
  const etiqueta = etiquetaDe(noLeidos)
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        onClick={alAlternar}
        className={`${CLASE} hidden md:inline-flex`}
      >
        <MessageSquareIcon aria-hidden className="size-5" />
        <ContadorDeLaBurbuja noLeidos={noLeidos} />
      </button>
      <Link href="/chat" aria-label={etiqueta} className={`${CLASE} inline-flex md:hidden`}>
        <MessageSquareIcon aria-hidden className="size-5" />
        <ContadorDeLaBurbuja noLeidos={noLeidos} />
      </Link>
    </>
  )
})
