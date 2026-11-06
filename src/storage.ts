// Persistência local do app: tudo vai para o localStorage com o prefixo `bichodex:`, em JSON.
// Usado pelo App (local, raio, dex, trilha, progresso), por themes.ts, highlights.ts e jogos; o Backup
// usa as funções de exportar/importar para levar esses dados a outro aparelho. Não há servidor.

/** Prefixo de todas as chaves do app no localStorage (separa dos outros sites da mesma origem). */
const PREFIX = 'bichodex:'

/** Lê a chave `bichodex:<key>` do localStorage; devolve `fallback` se não existir ou não for JSON válido. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Grava `value` em JSON na chave `bichodex:<key>`; falhas (cota cheia, modo privado) são ignoradas. */
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível (modo privado etc.): o app segue funcionando sem persistir
  }
}

/** Formato do arquivo de cópia: `data` tem as chaves sem o prefixo, com os valores já decodificados. */
export interface BackupData {
  app: 'bichodex'
  version: 1
  exportedAt: string
  data: Record<string, unknown>
}

/** Tudo o que o app guarda neste navegador, para levar a outro aparelho. */
export function exportBackup(): BackupData {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    try {
      data[key.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      // valor corrompido: fica de fora da cópia
    }
  }
  return { app: 'bichodex', version: 1, exportedAt: new Date().toISOString(), data }
}

/** Lê uma cópia exportada; devolve nulo se o texto não for uma cópia do Bichodex. */
export function parseBackup(text: string): BackupData | null {
  try {
    const backup = JSON.parse(text)
    if (backup?.app !== 'bichodex' || typeof backup.data !== 'object' || backup.data === null) return null
    return backup as BackupData
  } catch {
    return null
  }
}

/**
 * Substitui os dados deste navegador pelos da cópia: apaga todas as chaves `bichodex:` e grava as da cópia.
 * Se a gravação falhar no meio (cota cheia, por exemplo), desfaz: apaga o que já foi gravado, devolve os
 * valores antigos, exatamente como estavam, e relança o erro para quem chama avisar a pessoa.
 */
export function restoreBackup(backup: BackupData): void {
  // guarda chaves e valores antes de apagar: remover durante o laço mudaria os índices de localStorage.key(i),
  // e os valores brutos servem para desfazer se algo der errado
  const previous: [string, string][] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) previous.push([key, localStorage.getItem(key) ?? 'null'])
  }
  // os textos a gravar são montados antes de apagar qualquer coisa (um valor que não vira JSON falha aqui)
  const next = Object.entries(backup.data).map(([key, value]) => [PREFIX + key, JSON.stringify(value)] as const)
  try {
    previous.forEach(([key]) => localStorage.removeItem(key))
    for (const [key, raw] of next) localStorage.setItem(key, raw)
  } catch (error) {
    next.forEach(([key]) => localStorage.removeItem(key))
    for (const [key, raw] of previous) {
      try {
        localStorage.setItem(key, raw)
      } catch {
        // sem espaço nem para o valor antigo: não há o que fazer além de seguir com os outros
      }
    }
    throw error
  }
}
