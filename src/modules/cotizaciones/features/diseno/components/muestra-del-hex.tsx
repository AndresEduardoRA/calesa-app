type Props = { hex: string; tinta: string }

// El color tal cual, como lo pinta la tarjeta de la cotización: el hex de fondo, su texto (el que se lee, `tintaDeLaTarjeta()`) y el hex escrito en mono.
export function MuestraDelHex({ hex, tinta }: Props) {
  return (
    <span
      data-muestra="tarjeta"
      className="inline-flex h-8 items-center rounded-md px-2.5 font-mono text-(length:--text-sm)"
      style={{ backgroundColor: hex, color: tinta }}
    >
      {hex}
    </span>
  )
}
