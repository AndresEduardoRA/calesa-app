'use client'

import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/shared/ui/button'

// La cabecera de una columna cuya hoja no se pudo leer. «Reintentar» relee la página (las tres van juntas: no hay forma de releer una sin partir la alineación); las
// demás columnas siguen a la vista mientras tanto.
export function ColumnaConError({ numero }: { numero: number }) {
  const router = useRouter()
  return (
    <div role="alert" className="grid min-w-0 gap-2 text-left font-normal">
      <p className="text-(--color-ink)">No pudimos cargar la cotización #{numero}.</p>
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 w-full md:min-h-9' })}
        onClick={() => {
          router.refresh()
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
