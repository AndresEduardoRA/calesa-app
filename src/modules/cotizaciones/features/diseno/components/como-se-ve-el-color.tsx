import { Aviso } from '@/shared/ui/aviso'
import { contrasteDeLaTarjeta, derivarColores, tintaDeLaTarjeta } from '../../../entities/colores'
import { TEMAS_DE_UN_TONO, normalizarHex } from '../../../entities/diseno/tonos'
import { MuestraDeColor } from './muestra-de-color'

export const AVISO_DE_LA_TARJETA = 'Con este color el texto de la tarjeta se lee con dificultad.'

const TITULO = 'text-(length:--text-sm) font-medium text-(--color-ink)'

// Cómo se ve el color mientras se escribe: en la hoja, sus versiones clara y oscura (las deriva `derivarColores()`, el espejo de lo que guardará la base) y, en la
// tarjeta, el hex tal cual con el texto que se lee y el contraste del negro y del blanco. Si ninguno de los dos llega a AA, un aviso suave que no frena el guardado.
// Con el hex a medio escribir no dibuja nada: ninguna muestra con colores falsos.
export function ComoSeVeElColor({ hex: escrito }: { hex: string }) {
  const hex = normalizarHex(escrito)
  if (hex === null) return null
  const colores = derivarColores(hex)
  const contraste = contrasteDeLaTarjeta(hex)
  return (
    <div data-como-se-ve="" className="grid gap-3">
      <div className="grid gap-1.5">
        <h3 className={TITULO}>En la hoja</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {TEMAS_DE_UN_TONO.map((tema) => (
            <MuestraDeColor key={tema} tema={tema} colores={colores[tema]} />
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <h3 className={TITULO}>En la tarjeta</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            data-muestra="tarjeta"
            className="inline-flex h-10 items-center rounded-md px-3 font-semibold"
            style={{ backgroundColor: hex, color: tintaDeLaTarjeta(hex, colores.claro.tinta) }}
          >
            Así se ve
          </span>
          <ul className="grid text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
            <li>Con texto negro: {contraste.textoNegro}:1</li>
            <li>Con texto blanco: {contraste.textoBlanco}:1</li>
          </ul>
        </div>
        {contraste.aviso ? <Aviso tono="aviso">{AVISO_DE_LA_TARJETA}</Aviso> : null}
      </div>
    </div>
  )
}
