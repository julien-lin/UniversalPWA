/**
 * Options pour le traitement parallèle
 */
export interface ParallelProcessorOptions {
  /** Nombre maximum de tâches à exécuter en parallèle (défaut: 10) */
  concurrency?: number
  /** Continuer le traitement même si une tâche échoue (défaut: true) */
  continueOnError?: boolean
  /** Callback appelé à chaque progression */
  onProgress?: (processed: number, total: number) => void
}

/**
 * Résultat du traitement parallèle
 */
export interface ParallelProcessorResult<T, R> {
  /** Tâches réussies avec leur résultat */
  successful: Array<{ item: T; result: R }>
  /** Tâches échouées avec leur erreur */
  failed: Array<{ item: T; error: string }>
  /** Nombre total de tâches traitées */
  totalProcessed: number
  /** Nombre de tâches échouées */
  totalFailed: number
}

/**
 * Traite des items en parallèle avec limite de concurrence
 * 
 * @param items - Liste des items à traiter
 * @param processor - Fonction qui traite un item (peut être async)
 * @param options - Options de traitement
 * @returns Résultat du traitement avec succès/échecs
 * 
 * @example
 * ```typescript
 * const files = ['file1.html', 'file2.html', 'file3.html']
 * const result = await processInParallel(
 *   files,
 *   async (file) => await processFile(file),
 *   { concurrency: 5, onProgress: (done, total) => console.log(`${done}/${total}`) }
 * )
 * ```
 */
export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  options: ParallelProcessorOptions = {},
): Promise<ParallelProcessorResult<T, R>> {
  const {
    concurrency = 10,
    continueOnError = true,
    onProgress,
  } = options

  const successful: Array<{ item: T; result: R }> = []
  const failed: Array<{ item: T; error: string }> = []

  // Traiter les items par batches avec limite de concurrence
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    // Exécuter le batch en parallèle
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const result = await processor(item)
          return { item, result, success: true as const }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (!continueOnError) {
            throw new Error(`Processing failed for item: ${message}`)
          }
          return { item, error: message, success: false as const }
        }
      })
    )

    // Traiter les résultats du batch
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push({ item: result.value.item, result: result.value.result })
        } else {
          failed.push({ item: result.value.item, error: result.value.error })
        }
      } else {
        // Promise rejected (ne devrait pas arriver avec Promise.allSettled, mais on le gère)
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason)
        // On ne peut pas identifier l'item dans ce cas, donc on utilise le dernier item du batch
        failed.push({ item: batch[batch.length - 1], error: errorMessage })
      }
    }

    // Appeler le callback de progression
    if (onProgress) {
      const processed = Math.min(i + concurrency, items.length)
      onProgress(processed, items.length)
    }
  }

  return {
    successful,
    failed,
    totalProcessed: successful.length,
    totalFailed: failed.length,
  }
}

/**
 * Traite des items en parallèle avec limite de concurrence (version simplifiée)
 * Retourne uniquement les résultats réussis
 * 
 * @param items - Liste des items à traiter
 * @param processor - Fonction qui traite un item
 * @param concurrency - Nombre maximum de tâches en parallèle (défaut: 10)
 * @returns Liste des résultats réussis
 */
export async function processInParallelSimple<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  concurrency: number = 10,
): Promise<R[]> {
  const result = await processInParallel(items, processor, { concurrency, continueOnError: true })
  return result.successful.map((s) => s.result)
}
