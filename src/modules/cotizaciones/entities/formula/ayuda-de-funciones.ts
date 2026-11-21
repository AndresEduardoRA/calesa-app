// Las diez funciones de la planilla para quien escribe (D5 y «¿Cómo se escribe?»): la firma, una frase y un ejemplo en A1 que compila. Las usan el autocompletar
// y el panel «¿Cómo se escribe?». Los nombres son los de `FUNCIONES` del compilador (lo fija su test). Puro.

export type AyudaDeFuncion = {
  readonly nombre: string
  readonly firma: string
  readonly frase: string
  readonly ejemplo: string
}

export const FUNCIONES_DE_LA_AYUDA: readonly AyudaDeFuncion[] = [
  {
    nombre: 'SUMA',
    firma: 'SUMA(valor; valor; …)',
    frase: 'Suma valores, un rango de la columna C o una banda entera.',
    ejemplo: '=SUMA(C5:C9)',
  },
  {
    nombre: 'SI',
    firma: 'SI(condición; si se cumple; si no)',
    frase: 'Elige un valor según una condición.',
    ejemplo: '=SI(C3>0; C5; 0)',
  },
  {
    nombre: 'Y',
    firma: 'Y(condición; condición; …)',
    frase: 'Se cumple si se cumplen todas.',
    ejemplo: '=SI(Y(C2>1000; C3>0); C5; 0)',
  },
  {
    nombre: 'O',
    firma: 'O(condición; condición; …)',
    frase: 'Se cumple si se cumple alguna.',
    ejemplo: '=SI(O(C2>1000; C3>0); C5; 0)',
  },
  {
    nombre: 'MAX',
    firma: 'MAX(valor; valor; …)',
    frase: 'El mayor de los valores.',
    ejemplo: '=MAX(C5; 100)',
  },
  {
    nombre: 'MIN',
    firma: 'MIN(valor; valor; …)',
    frase: 'El menor de los valores.',
    ejemplo: '=MIN(C5; C7)',
  },
  {
    nombre: 'BUSCARV',
    firma: 'BUSCARV(lo que se busca; "tabla"; "columna")',
    frase: 'Busca en una tabla de referencia y trae el valor de una columna.',
    ejemplo: '=BUSCARV(C2; "fletes"; "precio")',
  },
  {
    nombre: 'REDONDEAR',
    firma: 'REDONDEAR(valor; decimales)',
    frase: 'Redondea a esa cantidad de decimales, de 0 a 6.',
    ejemplo: '=REDONDEAR(C9; 0)',
  },
  {
    nombre: 'PORCENTAJE_DE',
    firma: 'PORCENTAJE_DE(monto; %)',
    frase: 'Ese porcentaje del monto; el % queda en la columna B.',
    ejemplo: '=PORCENTAJE_DE(C5+C7; 4%)',
  },
  {
    nombre: 'DEPRECIAR',
    firma: 'DEPRECIAR(valor; tabla; sobre; columna)',
    frase: 'Aplica el factor de la fila de la tabla donde cae «sobre» (por ejemplo, el año).',
    ejemplo: '=DEPRECIAR(C5; depreciacion; C2; factor)',
  },
]
