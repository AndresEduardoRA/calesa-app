// Un turno de la cola: `turno` se cumple cuando le toca; `soltar()` lo devuelve al terminar o, si todavía no le tocaba, deja la fila (las dos cosas, una vez).
export type TurnoDeLaCola = { turno: Promise<void>; soltar: () => void }

export type Cola = {
  pedir: () => TurnoDeLaCola
}

// A lo sumo `maximo` turnos a la vez, en el orden en que se pidieron (las imágenes de la tarjeta de una lista: el servidor arma unas pocas a la vez, no todas).
export function crearCola(maximo: number): Cola {
  let enCurso = 0
  const fila: (() => void)[] = []

  const avanzar = () => {
    while (enCurso < maximo) {
      const dar = fila.shift()
      if (dar === undefined) return
      enCurso += 1
      dar()
    }
  }

  return {
    pedir: () => {
      let estado: 'esperando' | 'con-turno' | 'suelto' = 'esperando'
      let cumplir: () => void = () => undefined
      const turno = new Promise<void>((resolver) => {
        cumplir = resolver
      })
      const dar = () => {
        estado = 'con-turno'
        cumplir()
      }
      fila.push(dar)
      avanzar()
      return {
        turno,
        soltar: () => {
          if (estado === 'esperando') {
            fila.splice(fila.indexOf(dar), 1)
          } else if (estado === 'con-turno') {
            enCurso -= 1
            avanzar()
          }
          estado = 'suelto'
        },
      }
    },
  }
}
