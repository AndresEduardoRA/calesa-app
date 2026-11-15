'use client'

import { Component, type ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'

type Props = {
  titulo: string
  children: ReactNode
}

type Estado = { fallo: boolean; intento: number }

// Un hueco que falla al dibujarse no tumba la página: el aviso queda en su lugar, con «Reintentar» (vuelve a montar el hueco desde cero). Un error de lectura ya lo dice el hueco mismo; esto
// atrapa lo que se rompe al dibujar.
export class LimiteDelHueco extends Component<Props, Estado> {
  override state: Estado = { fallo: false, intento: 0 }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override componentDidCatch(error: Error) {
    console.warn(`No se pudo dibujar el hueco «${this.props.titulo}»`, error.message)
  }

  override render() {
    if (!this.state.fallo) {
      return <Reintentable key={this.state.intento}>{this.props.children}</Reintentable>
    }
    return (
      <Aviso tono="peligro" className="items-center">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {`No pudimos mostrar «${this.props.titulo}».`}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              this.setState((previo) => ({ fallo: false, intento: previo.intento + 1 }))
            }}
          >
            Reintentar
          </Button>
        </span>
      </Aviso>
    )
  }
}

// Un contenedor sin nada propio: su `key` cambia con cada intento para que el hijo se monte de nuevo.
function Reintentable({ children }: { children: ReactNode }) {
  return children
}
