import { etiquetaDeComun, loteALaVista } from '../../../entities/comunes'

// El lote de la subasta sobre la foto de la tarjeta de la lista, abajo a la izquierda («Lote 75089446»); sin lote no se dibuja. Velo oscuro y texto claro,
// fijos en los dos temas: se lee sobre cualquier foto. No recibe el puntero (el clic y el gesto siguen siendo del carrusel) y se corta con «…» antes de
// llegar a los puntos, que en la tarjeta van a la derecha; el `title` lo dice entero. El lote no es dinero: Live no lo tapa.
export function ChipDelLote({ lote }: { lote: string | null }) {
  const valor = loteALaVista(lote)
  if (valor === null) return null
  const texto = `${etiquetaDeComun('lote')} ${valor}`
  return (
    <span
      title={texto}
      data-chip-del-lote=""
      className="pointer-events-none absolute bottom-1 left-1 max-w-[calc(100%-5.5rem)] truncate rounded-(--radius-sm) bg-(--color-velo-de-foto) px-1.5 py-0.5 text-(length:--text-xs) font-medium text-(--color-sobre-velo) tabular-nums"
    >
      {texto}
    </span>
  )
}
