import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { correr, leer, nuevaRaiz, prJson } from './sin-sesion-banco'

// sin-sesion.sh ante un CI en rojo: qué se relanza sin sesión y qué rojo no espera a «Listo».
describe('reintentar_ci_ajeno', () => {
  const reintentar = (raiz: string, j: string) =>
    correr(raiz, `reintentar_ci_ajeno T1 9 '${j}'; echo "rc=$?"`).stdout

  it('lo caído por la máquina del CI se relanza hasta dos veces por punta, y una punta nueva vuelve a contar', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.tsx\n')
    writeFileSync(
      join(raiz, 'gh/log-job-3'),
      'Error: failed to start containers: supabase_db_app\n',
    )
    const base = 'Base · reset, tipos, probar, lint y advisors'
    const j = prJson([{ nombre: base, run: 77, job: 3 }])
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    expect(leer(join(raiz, 'est/log'))).toContain('relanzo lo caído (1 de 2 en esta punta)')
    // La misma punta, recién relanzada: espera sin abrir sesión ni relanzar de nuevo.
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    // Pasados los 10 minutos, el segundo relanzamiento; y pasados otros 10, el rojo de esa punta va a la sesión.
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n77\n')
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(reintentar(raiz, j)).toContain('rc=1')
    expect(reintentar(raiz, prJson([{ nombre: base, run: 78, job: 3 }], 'otro'))).toContain('rc=0')
  })

  it('un bloque de e2e en specs que el PR no toca se relanza una sola vez por tarea, aunque cambie la punta', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.tsx\ne2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/ajeno.spec.ts:10:5 › algo\n')
    const j = prJson([{ nombre: 'e2e · bloque 2 de 4', run: 77 }])
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    // Pasados los 10 minutos sigue rojo: va a la sesión, no a un segundo relanzamiento.
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(reintentar(raiz, j)).toContain('rc=1')
    // La rama puesta al día con main (otra punta) tampoco vuelve a relanzarlo.
    expect(
      reintentar(raiz, prJson([{ nombre: 'e2e · bloque 2 de 4', run: 78 }], 'otro')),
    ).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
  })

  it('no relanza si cayó un spec que el PR toca', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'e2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/mio.spec.ts:3:1 › lo mío\n')
    expect(reintentar(raiz, prJson([{ nombre: 'e2e · bloque 1 de 4', run: 5 }]))).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })

  it('no relanza si cayó algo que no es un bloque de e2e sin la firma de la máquina del CI', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.ts\n')
    writeFileSync(
      join(raiz, 'gh/log-job-2'),
      'FAIL src/a.test.ts > suma\nAssertionError: expected 3\n',
    )
    const j = prJson([
      { nombre: 'e2e · bloque 1 de 4', run: 5 },
      { nombre: 'Nivel 1 · tests, parte 2 de 3', run: 5, job: 2 },
    ])
    expect(reintentar(raiz, j)).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })

  it('relanza un job que no es de e2e si su log tiene la firma de la máquina del CI', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'supabase/migrations/20261118000000_x.sql\n')
    writeFileSync(
      join(raiz, 'gh/log-job-3'),
      'Base\tsupabase start\tError: failed to start containers: supabase_db_app\n',
    )
    const j = prJson([{ nombre: 'Base · reset, tipos, probar, lint y advisors', run: 9, job: 3 }])
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('9\n')
    expect(leer(join(raiz, 'est/log'))).toContain('(la máquina del CI)')
  })
})

describe('cayo_lo_del_pr: el rojo sin esperar a «Listo»', () => {
  const cayo = (raiz: string, j: string) =>
    correr(raiz, `cayo_lo_del_pr T1 '${j}'; echo "rc=$?"`).stdout

  it('un job que no es un bloque de e2e, caído sin la firma de la máquina, ya es el rojo del PR', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-job-2'), "error TS2307: Cannot find module './soporte/x'\n")
    expect(
      cayo(raiz, prJson([{ nombre: 'Nivel 1 · lint, tipos, test:kit y mapa', run: 5, job: 2 }])),
    ).toContain('rc=0')
  })

  it('un bloque de e2e caído espera a «Listo»: relanzar lo ajeno pide la corrida terminada', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/x.spec.ts:1:1 › algo\n')
    expect(cayo(raiz, prJson([{ nombre: 'e2e · bloque 1 de 4', run: 5 }]))).toContain('rc=1')
  })

  it('lo caído por la máquina del CI espera a «Listo», y su log se lee una sola vez', () => {
    const raiz = nuevaRaiz()
    writeFileSync(
      join(raiz, 'gh/log-job-3'),
      'Error: failed to start containers: supabase_db_app\n',
    )
    const j = prJson([{ nombre: 'Base · reset, tipos, probar, lint y advisors', run: 5, job: 3 }])
    expect(cayo(raiz, j)).toContain('rc=1')
    // Ya juzgado: aunque el log ahora dijera otra cosa, no se vuelve a leer.
    writeFileSync(join(raiz, 'gh/log-job-3'), 'FAIL algo\n')
    expect(cayo(raiz, j)).toContain('rc=1')
  })
})
