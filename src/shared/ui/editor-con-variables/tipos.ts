// Una variable que un texto acepta: su clave (`codigo`, que se escribe `{codigo}`), cómo se llama en el botón y si el texto la exige.
export type VariableDelEditor = {
  clave: string
  etiqueta: string
  obligatoria?: boolean
}
