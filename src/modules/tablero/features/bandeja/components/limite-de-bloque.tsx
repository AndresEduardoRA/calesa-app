'use client'

import { Component, type ReactNode } from 'react'
import { ErrorDeBloque } from './error-de-bloque'

type Estado = { fallo: boolean; intento: number }

// Un bloque que se rompe al dibujarse (no al leer: eso ya lo dice el bloque con su error) no tumba el Inicio: queda su marco con el error y
// «Reintentar», y los demás bloques siguen. «Reintentar» monta el bloque de nuevo y vuelve a pedir la pantalla.
export class LimiteDeBloque extends Component<{ children: ReactNode }, Estado> {
  override state: Estado = { fallo: false, intento: 0 }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override componentDidCatch(error: Error) {
    console.warn('No se pudo dibujar un bloque de Inicio', error.message)
  }

  override render() {
    if (this.state.fallo) {
      return (
        <ErrorDeBloque
          alReintentar={() => {
            this.setState((previo) => ({ fallo: false, intento: previo.intento + 1 }))
          }}
        />
      )
    }
    return <Reintentable key={this.state.intento}>{this.props.children}</Reintentable>
  }
}

// Sin nada propio: su `key` cambia con cada intento para que el bloque se monte de nuevo.
function Reintentable({ children }: { children: ReactNode }) {
  return children
}
