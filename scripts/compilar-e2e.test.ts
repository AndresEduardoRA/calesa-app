import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// compilar-e2e.sh repite el build una sola vez y sólo si Next lo cortó con SecurityFatalError. Se prueba con un `next` falso que anota
// cada llamada y falla como se le pida.
const GUION = resolve('scripts/compilar-e2e.sh')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function correr(fallos: string[]) {
  const raiz = mkdtempSync(join(tmpdir(), 'compilar-e2e-'))
  raices.push(raiz)
  // La llamada n responde con fallos[n]: '' compila, 'aviso' corta con SecurityFatalError, 'otro' falla por otra cosa.
  writeFileSync(join(raiz, 'respuestas'), `${fallos.join('\n')}\n`)
  writeFileSync(
    join(raiz, 'next'),
    `#!/usr/bin/env bash
echo "$NEXT_DIST_DIR $*" >> "${join(raiz, 'llamadas')}"
n=$(wc -l < "${join(raiz, 'llamadas')}")
r=$(sed -n "\${n}p" "${join(raiz, 'respuestas')}")
case "$r" in
  aviso) echo 'Error [SecurityFatalError]: Your version of Next.js is affected'; exit 1 ;;
  otro) echo 'Type error: algo'; exit 1 ;;
esac
echo 'Compiled'
`,
  )
  chmodSync(join(raiz, 'next'), 0o755)
  const r = spawnSync('bash', [GUION], {
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: `${raiz}:${process.env['PATH'] ?? ''}` },
  })
  return {
    estado: r.status,
    llamadas: readFileSync(join(raiz, 'llamadas'), 'utf8').trim().split('\n'),
  }
}

describe('compilar-e2e.sh', () => {
  it('compila en .next-e2e una vez si no falla', () => {
    const r = correr([''])
    expect(r.estado).toBe(0)
    expect(r.llamadas).toEqual(['.next-e2e build'])
  })

  it('repite una vez si Next lo cortó con su aviso de seguridad', () => {
    const r = correr(['aviso', ''])
    expect(r.estado).toBe(0)
    expect(r.llamadas).toHaveLength(2)
  })

  it('no repite otro fallo, ni un segundo aviso', () => {
    expect(correr(['otro', '']).llamadas).toHaveLength(1)
    const dos = correr(['aviso', 'aviso', ''])
    expect(dos.estado).toBe(1)
    expect(dos.llamadas).toHaveLength(2)
  })
})
