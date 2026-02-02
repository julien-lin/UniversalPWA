# Helpers de tests (core)

Guide pour les contributeurs : utilisation des helpers centralisés dans les tests du package core.

## test-helpers.ts

Import : `import { createTestDir, cleanupTestDir, createSymfonyFixture, ... } from './__tests__/test-helpers.js'`

### Répertoire temporaire

- **createTestDir(prefix?)**  
  Crée un répertoire temporaire unique (sous `os.tmpdir()`). À appeler dans `beforeEach`. Retourne le chemin absolu.

- **cleanupTestDir(path)**  
  Supprime le répertoire (récursif, `force: true`). À appeler dans `afterEach`. Ignore les erreurs de suppression.

**Exemple :**

```ts
let testDir: string
beforeEach(() => { testDir = createTestDir('mon-prefix') })
afterEach(() => { cleanupTestDir(testDir) })
```

### Fichiers et structure

- **createFile(dir, filename, content)** — Crée un fichier avec contenu, retourne le chemin.
- **createJsonFile(dir, filename, data)** — Crée un fichier JSON.
- **createDirectoryStructure(basePath, structure)** — Crée une arborescence (fichiers et dossiers).

### Fixtures backend

- **createSymfonyFixture(testDir, options?)**  
  Crée un projet type Symfony (config/, public/, src/, composer.json, public/index.php, etc.).  
  Options : `name`, `version`, `apiPlatform`, `hasSPA`, `publicIndexHtml`.

- **createLaravelFixture(testDir, options?)**  
  Crée un projet type Laravel (app/, config/, public/, composer.json, artisan, etc.).  
  Options : `publicIndexHtml`.

- **createDjangoFixture(testDir)**  
  Crée un projet type Django (manage.py, myproject/, myapp/, requirements.txt, etc.).

- **createFlaskFixture(testDir)**  
  Crée un projet type Flask (app.py, requirements.txt).

**Exemple :**

```ts
const testDir = createTestDir('symfony')
createSymfonyFixture(testDir, { apiPlatform: true })
// puis exécuter le code à tester sur testDir
cleanupTestDir(testDir)
```

### Assertions et utilitaires

- **expectFileExists(path)**, **expectFileNotExists(path)**  
- **expectFileContent(path, contentOrMatcher)**  
- **readJsonFile(path)**  
- **createErrorWithCode(code, message)**  
- **ERROR_CODES**, **TEST_TIMEOUTS**, **TEST_THRESHOLDS**

---

## backends/__tests__/helpers/

### fs-mock.ts

Après `vi.mock('node:fs')`, configure les mocks `existsSync` et `readFileSync` pour les tests de détection backend (Laravel, Django, Flask).

- **createFsMockForBackend(options)**  
  - `existsPaths`: tableau de sous-chaînes de chemin pour lesquelles `existsSync` retourne `true`.  
  - `existsReturn`: valeur par défaut de `existsSync` (défaut `false`).  
  - `readFileMap`: objet `{ "sous-chemin": "contenu" }` pour `readFileSync`.

**Exemple :**

```ts
vi.mock('node:fs')
createFsMockForBackend({
  existsPaths: ['composer.json', 'artisan', 'config', 'app'],
  readFileMap: { 'composer.json': JSON.stringify({ require: { 'laravel/framework': '^11.0' } }) },
})
const result = integration.detect()
```

### expect-backend-contract.ts

- **expectBackendContract(integration)**  
  Vérifie le contrat commun des backends : `getStartUrl() === '/'`, `getApiPatterns()` contient `'/api/**'`, `getStaticAssetPatterns()` est un tableau non vide.  
  Utilisé dans laravel.test, django.test, flask.test.

---

## mocks/workbox-build.ts

Mock partagé pour le module `workbox-build` (generateSW, injectManifest). Utilisé par les tests core (ex. service-worker-generator, laravel.integration) et CLI (init.test, init.base-path.test) pour éviter d’exécuter Workbox.

- **createWorkboxBuildMock(importOriginal?)**  
  Retourne une Promise d’objet mock (generateSW, injectManifest) qui écrit un faux SW et résout avec des stats factices.

Dans les tests : `vi.mock('workbox-build', async (importOriginal) => { const { createWorkboxBuildMock } = await import('.../mocks/workbox-build.js'); return createWorkboxBuildMock(importOriginal); })`

---

## CLI : init-helpers

Les tests init du CLI utilisent `packages/cli/src/__tests__/init-helpers.ts` :  
**createBasicHtml**, **createIcon**, **runInitInTestDir**, **setupPublicWithManifest**.  
Voir ce fichier pour l’API.
