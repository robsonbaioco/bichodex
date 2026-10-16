const PREFIX = 'bichodex:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível (modo privado etc.): o app segue funcionando sem persistir
  }
}

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

/** Substitui os dados deste navegador pelos da cópia. */
export function restoreBackup(backup: BackupData): void {
  const current: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) current.push(key)
  }
  current.forEach((key) => localStorage.removeItem(key))
  for (const [key, value] of Object.entries(backup.data)) localStorage.setItem(PREFIX + key, JSON.stringify(value))
}
