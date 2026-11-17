'use client'

import { useRouter } from 'next/navigation'
import { Component, type ReactNode } from 'react'
import { Button } from '../button'
import { TITULO_DE_BLOQUE } from './estilos'

type Props = {
  titulo: string
  // El marco ya dibujó el título: el error va debajo, sin repetirlo.
  conTitulo: boolean
  alReintentar: () => void
  children: ReactNode
}

type Estado = { fallo: boolean; intento: number }

// Un bloque que se rompe, al leer en el servidor (el error llega hasta acá) o al dibujarse, no tumba la ficha: queda su título, «No
// pudimos cargar «<título>».» y «Reintentar», que lo monta de nuevo y vuelve a pedir la pantalla. Los demás bloques siguen.
class Limite extends Component<Props, Estado> {
  override state: Estado = { fallo: false, intento: 0 }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override componentDidCatch(error: Error) {
    console.warn(`No se pudo dibujar el bloque «${this.props.titulo}»`, error.message)
  }

  override render() {
    if (!this.state.fallo) {
      return <Reintentable key={this.state.intento}>{this.props.children}</Reintentable>
    }
    const { titulo, conTitulo } = this.props
    return (
      <div role="alert" className="grid gap-2">
        {conTitulo ? null : <h2 className={TITULO_DE_BLOQUE}>{titulo}</h2>}
        <p className="text-(length:--text-sm) text-(--color-ink)">No pudimos cargar «{titulo}».</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => {
            this.setState((previo) => ({ fallo: false, intento: previo.intento + 1 }))
            this.props.alReintentar()
          }}
        >
          Reintentar
        </Button>
      </div>
    )
  }
}

// Sin nada propio: su `key` cambia con cada intento para que el bloque se monte de nuevo.
function Reintentable({ children }: { children: ReactNode }) {
  return children
}

export function LimiteDelBloque(props: Omit<Props, 'alReintentar'>) {
  const router = useRouter()
  return <Limite {...props} alReintentar={router.refresh} />
}
