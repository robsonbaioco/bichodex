// Regras sobre as fotos do iNaturalist usadas pelo cartão de conquista (ShareAchievement) e pelo colorir
// (Coloring): quais fotos podem ser reaproveitadas e o endereço da versão grande. Funções puras, sem rede.
import type { Photo } from './api'

/**
 * Só reutilizamos fotos do catálogo com licença Creative Commons que permita obras derivadas (o cartão e o
 * desenho para colorir são obras derivadas da foto): precisa ter URL e licença, e a licença não pode ser "nd".
 */
export function isReusable(photo: Photo | null | undefined): photo is Photo {
  return !!(photo?.medium_url ?? photo?.square_url) && !!photo?.license_code && !photo.license_code.includes('nd')
}

/** URL da versão grande da foto: o iNaturalist só muda o tamanho no nome do arquivo (square/medium/large). */
export const largeUrl = (photo: Photo) => (photo.medium_url ?? photo.square_url)!.replace(/\/(medium|square)\./, '/large.')
