# 📋 TODOLIST IMPLÉMENTATION - UniversalPWA v2.0 → v3.0

**Status**: 🟡 EN COURS (Phase 1: 2/28 ✅)  
**Date de création**: 16 janvier 2026  
**Dernière mise à jour**: 16 janvier 2026  
**Target completion**: Décembre 2026  
**Total tasks**: 97 items  

---

## 🎯 Vue d'ensemble des phases

| Phase | Période | Focus | Tasks | Status |
|-------|---------|-------|-------|--------|
| **Phase 1: Consolidation** | Jan - Fév 2026 | Backend support, Templates | 28 | 🟡 2/28 ✅ |
| **Phase 2: Expansion** | Mar - Mai 2026 | API Server, Multi-SDK | 31 | 🔴 À faire |
| **Phase 3: Polish** | Juin - Août 2026 | Advanced features, Performance | 24 | 🔴 À faire |
| **Phase 4: SaaS** | Sept - Déc 2026 | Dashboard, Monetization | 14 | 🔴 À faire |

---

## 📌 PHASE 1: CONSOLIDATION (Jan - Fév 2026)

### 1️⃣ Architecture Refactoring (Week 1-2)

#### Task 1.1: Design Backend Integration Layer ✅ COMPLETED
- [x] Créer la structure abstraite `BackendIntegration` interface
- [x] Documenter les patterns de détection par backend
- [x] Définir la structure de `ServiceWorkerConfig` enrichie
- [x] Créer architecture decision record (ADR)
- **Estimé**: 6 heures | **Réel**: 6 heures ✅
- **Dépendances**: Aucune
- **Acceptance criteria**: 
  - [x] Interface `BackendIntegration` finalisée ✅
  - [x] 9 ADRs documentés (target 3+) ✅
  - [x] Diagram d'architecture validé ✅
- **Status**: ✅ COMPLETED 16-01-2026
- **Deliverables**: 
  - `/packages/core/src/backends/types.ts` (300 lines)
  - `/packages/core/src/backends/base.ts` (150 lines)
  - `/packages/core/src/backends/factory.ts` (90 lines)
  - `/DOCUMENTATION/ARCHITECTURE_DECISIONS.md` (9 ADRs)
  - `/DOCUMENTATION/BACKEND_DETECTION_PATTERNS.md`
  - `/DOCUMENTATION/TASK_1_1_SUMMARY.md`

#### Task 1.2: Create packages/backends/ directory structure ✅ COMPLETED
- [x] Créer `/packages/core/src/backends/` folder
- [x] Créer interface abstraite `BackendIntegration`
- [x] Créer `index.ts` pour exports
- [x] Créer types pour backend-specific configs
- **Estimé**: 4 heures | **Réel**: 4 heures ✅ (inclus Task 1.1)
- **Dépendances**: 1.1 ✅
- **Acceptance criteria**:
  - [x] Structure compilée sans erreurs (ESM + CJS + DTS) ✅
  - [x] Exports typés correctement ✅
- **Status**: ✅ COMPLETED 16-01-2026
- **Notes**: Déjà complété en Task 1.1. Backend abstraction layer est prêt.

#### Task 1.3: Design Service Worker generation pipeline 🟡 IN PROGRESS
- [ ] Refactorer `service-worker-generator.ts`
- [ ] Créer abstraction pour stratégies de caching
- [ ] Documenter route-based caching system
- [ ] Créer tests pour pipeline
- **Estimé**: 8 heures
- **Dépendances**: 1.1 ✅ 1.2 ✅
- **Acceptance criteria**:
  - SW generation supportera routes patterns
  - Pipeline testable et mockable
  - Coverage >85%
- **Status**: 🟡 IN PROGRESS 16-01-2026
- **Scope**:
  - Examiner le code existant de `service-worker-generator.ts`
  - Créer interface `CachingStrategy`
  - Implémenter route matching abstraction
  - Créer tests complets

#### Task 1.4: Plan SDK & Backend structure
- [ ] Design SDK package layout
- [ ] Définir interface commune pour tous les SDKs
- [ ] Créer proto SDKs (Python, Ruby, Java, Go)
- [ ] Documenter SDK architecture
- **Estimé**: 5 heures
- **Dépendances**: 1.1 ✅
- **Acceptance criteria**:
  - Proto SDKs compilent
  - Interface commune documentée
  - Example code works
- **Status**: 🔴 À faire (après 1.3)

---

### 2️⃣ Laravel Support (Week 2-3)

#### Task 2.1: Implement LaravelIntegration class
- [ ] Créer `packages/core/src/backends/laravel.ts`
- [ ] Implémenter `detect()` method
- [ ] Implémenter `generateServiceWorkerConfig()`
- [ ] Implémenter `generateManifestVariables()`
- [ ] Implémenter `injectMiddleware()`
- **Estimé**: 10 heures
- **Dépendances**: 1.3, 1.4
- **Acceptance criteria**:
  - Tests: 10+ test cases
  - Detecte Laravel projects correctement
  - Config générée valide
- **Status**: 🔴 À faire

#### Task 2.2: Laravel Service Worker Templates
- [ ] Créer template SPA pour Laravel
- [ ] Créer template SSR pour Laravel
- [ ] Créer template avec API routes caching
- [ ] Implémenter CSRF token handling
- **Estimé**: 8 heures
- **Dépendances**: 2.1, 1.3
- **Acceptance criteria**:
  - 3 templates fonctionnels
  - CSRF tokens préservés
  - API routes cachées intelligemment
- **Status**: 🔴 À faire

#### Task 2.3: Laravel SDK Integration
- [ ] Créer `packages/sdk-php/src/Laravel/` provider
- [ ] Implémenter Laravel Facade
- [ ] Créer middleware pour PWA routes
- [ ] Documenter usage in Laravel app
- **Estimé**: 8 heures
- **Dépendances**: 2.1
- **Acceptance criteria**:
  - Laravel app can use SDK
  - Middleware testable
  - Docs avec code examples
- **Status**: 🔴 À faire

#### Task 2.4: End-to-end Laravel Testing
- [ ] Setup test Laravel project
- [ ] Test framework detection
- [ ] Test SW generation
- [ ] Test meta-tag injection
- [ ] Test icon generation
- **Estimé**: 8 heures
- **Dépendances**: 2.1, 2.2, 2.3
- **Acceptance criteria**:
  - Real Laravel project transforms to PWA
  - All features tested
  - Screenshots/docs captured
- **Status**: 🔴 À faire

#### Task 2.5: Laravel Documentation
- [ ] Créer `packages/sdk-php/docs/LARAVEL.md`
- [ ] Inclure exemples d'utilisation
- [ ] Configuration guide
- [ ] Troubleshooting section
- **Estimé**: 4 heures
- **Dépendances**: 2.1-2.4
- **Acceptance criteria**:
  - Débutant peut suivre et réussir
  - Code examples runnable
- **Status**: 🔴 À faire

---

### 3️⃣ Symfony Support (Week 3-4)

#### Task 3.1: Implement SymfonyIntegration class
- [ ] Créer `packages/core/src/backends/symfony.ts`
- [ ] Implémenter détection Symfony (3, 4, 5, 6, 7)
- [ ] Implémenter `generateServiceWorkerConfig()`
- [ ] Support bundle-based assets
- **Estimé**: 10 heures
- **Dépendances**: 2.1 (reference)
- **Acceptance criteria**:
  - Détecte Symfony 4+ projects
  - Tests: 10+ cases
  - Coverage >85%
- **Status**: 🔴 À faire

#### Task 3.2: Symfony Service Worker Templates
- [ ] Créer template pour Symfony SPA (Webpack Encore)
- [ ] Créer template pour Symfony API
- [ ] Asset versioning support
- [ ] Security route handling (login, CSRF)
- **Estimé**: 8 heures
- **Dépendances**: 3.1
- **Acceptance criteria**:
  - 2+ templates
  - CSRF tokens handled
  - Asset versioning works
- **Status**: 🔴 À faire

#### Task 3.3: Symfony SDK Integration
- [ ] Créer `packages/sdk-php/src/Symfony/` service
- [ ] Implémenter Bundle/Service pattern
- [ ] Créer DI configuration
- [ ] Service locator setup
- **Estimé**: 8 heures
- **Dépendances**: 3.1
- **Acceptance criteria**:
  - Symfony can auto-wire service
  - DI container recognizes it
- **Status**: 🔴 À faire

#### Task 3.4: End-to-end Symfony Testing
- [ ] Setup test Symfony project
- [ ] Full PWA generation workflow
- [ ] Validate generated files
- [ ] Test with real routes
- **Estimé**: 8 heures
- **Dépendances**: 3.1-3.3
- **Acceptance criteria**:
  - Real project tested
  - All major Symfony versions
- **Status**: 🔴 À faire

#### Task 3.5: Symfony Documentation
- [ ] Create `packages/sdk-php/docs/SYMFONY.md`
- [ ] Bundle setup guide
- [ ] Configuration examples
- [ ] Common issues & fixes
- **Estimé**: 4 heures
- **Dépendances**: 3.1-3.4
- **Acceptance criteria**:
  - Complete & beginner-friendly
- **Status**: 🔴 À faire

---

### 4️⃣ Django Support (Week 4-5)

#### Task 4.1: Create packages/sdk-python/
- [ ] Setup Python package structure
- [ ] Configure pyproject.toml
- [ ] Setup testing (pytest)
- [ ] Create example Django app
- **Estimé**: 5 heures
- **Dépendances**: 1.4
- **Acceptance criteria**:
  - Package installable via pip
  - Tests runnable
- **Status**: 🔴 À faire

#### Task 4.2: Implement DjangoIntegration class
- [ ] Créer `packages/sdk-python/universal_pwa/backends/django.py`
- [ ] Detección Django versions (2.2, 3.x, 4.x, 5.x)
- [ ] ASGI support detection
- [ ] Static files configuration
- **Estimé**: 10 heures
- **Dépendances**: 4.1
- **Acceptance criteria**:
  - Detecte Django projects
  - Tests: 10+ cases
  - Version detection works
- **Status**: 🔴 À faire

#### Task 4.3: Django Service Worker Templates
- [ ] Create SPA template
- [ ] Create API-driven template
- [ ] CSRF token handling for Django
- [ ] Middleware integration
- **Estimé**: 8 heures
- **Dépendances**: 4.2
- **Acceptance criteria**:
  - 2+ templates
  - Django security patterns respected
- **Status**: 🔴 À faire

#### Task 4.4: Flask Support
- [ ] Implement FlaskIntegration
- [ ] Create Flask templates
- [ ] Flask extension/blueprint
- **Estimé**: 8 heures
- **Dépendances**: 4.1
- **Acceptance criteria**:
  - Flask projects supported
  - Tests pass
- **Status**: 🔴 À faire

#### Task 4.5: End-to-end Python Testing
- [ ] Test Django project PWA generation
- [ ] Test Flask project PWA generation
- [ ] Validate all outputs
- **Estimé**: 8 heures
- **Dépendances**: 4.2-4.4
- **Acceptance criteria**:
  - Real projects tested
  - All features verified
- **Status**: 🔴 À faire

#### Task 4.6: Python SDK Documentation
- [ ] Create README for sdk-python
- [ ] Django integration guide
- [ ] Flask integration guide
- [ ] Configuration reference
- **Estimé**: 4 heures
- **Dépendances**: 4.1-4.5
- **Acceptance criteria**:
  - Complete documentation
  - Runnable examples
- **Status**: 🔴 À faire

---

### 5️⃣ Advanced Icon Generation (Week 5-6)

#### Task 5.1: Design Icon Generation System
- [ ] Créer `IconGenerationConfig` type avancé
- [ ] Documenter multi-source hierarchy
- [ ] Plan adaptive icons strategy
- [ ] Design splash screens
- **Estimé**: 6 heures
- **Dépendances**: Aucune
- **Acceptance criteria**:
  - Config type complète
  - Architecture documentée
- **Status**: 🔴 À faire

#### Task 5.2: Implement Advanced Icon Processor
- [ ] Refactor `icon-generator.ts`
- [ ] Implémenter multi-source fallback
- [ ] Ajouter WebP support (sharp.webp())
- [ ] Ajouter quality optimization
- **Estimé**: 10 heures
- **Dépendances**: 5.1
- **Acceptance criteria**:
  - Icons générés en PNG + WebP
  - Quality optimisé
  - File sizes réduits
- **Status**: 🔴 À faire

#### Task 5.3: Implement Adaptive Icons (Android 8+)
- [ ] Implémenter adaptive icon generation
- [ ] Support foreground + background
- [ ] Test sur Android devices/emulator
- [ ] Validate manifest integration
- **Estimé**: 8 heures
- **Dépendances**: 5.2
- **Acceptance criteria**:
  - Adaptive icons generated
  - Tests show proper masking
- **Status**: 🔴 À faire

#### Task 5.4: Implement Splash Screens
- [ ] Generate splash screens multiples tailles
- [ ] Support multiple densities (ldpi-xxxhdpi)
- [ ] iOS splash screen support
- [ ] Manifest integration
- **Estimé**: 8 heures
- **Dépendances**: 5.2
- **Acceptance criteria**:
  - Splash screens générés
  - Manifest updated
  - Responsive on all devices
- **Status**: 🔴 À faire

#### Task 5.5: Test & Optimize Icon Generation
- [ ] Unit tests pour chaque format
- [ ] Performance benchmarks
- [ ] Memory usage optimization
- [ ] Edge cases handling
- **Estimé**: 8 heures
- **Dépendances**: 5.2-5.4
- **Acceptance criteria**:
  - Coverage >90%
  - Performance <2s per icon set
  - All edge cases handled
- **Status**: 🔴 À faire

---

### 6️⃣ Refactor Service Worker Generation (Week 6-7)

#### Task 6.1: Design Advanced Caching Config
- [ ] Create route-based caching config
- [ ] Plan per-route TTL
- [ ] Design dependency tracking
- [ ] Document invalidation strategies
- **Estimé**: 6 heures
- **Dépendances**: 1.3
- **Acceptance criteria**:
  - Config type designed
  - Examples for 5+ scenarios
- **Status**: 🔴 À faire (après 1.3)

#### Task 6.2: Implement Route-based Caching
- [ ] Refactor service worker generation
- [ ] Support regex + glob patterns
- [ ] Implement per-route strategies
- [ ] Add route priority handling
- **Estimé**: 10 heures
- **Dépendances**: 6.1
- **Acceptance criteria**:
  - Routes matched correctly
  - Strategies applied as specified
  - Tests: 15+ cases
- **Status**: 🔴 À faire

#### Task 6.3: Implement Smart Invalidation
- [ ] Create cache versioning system
- [ ] Implement dependency tracking
- [ ] Auto-invalidate on file changes
- [ ] Test version bumping
- **Estimé**: 8 heures
- **Dépendances**: 6.2
- **Acceptance criteria**:
  - Versioning works
  - Dependencies tracked
  - Invalidation triggers correctly
- **Status**: 🔴 À faire

#### Task 6.4: Generate Framework-Aware Templates
- [ ] Create React SPA template
- [ ] Create Next.js App Router template
- [ ] Create Next.js Pages Router template
- [ ] Create Vue SPA template
- [ ] Create Nuxt template
- [ ] Create Angular template
- [ ] Create Static template
- [ ] Create Hugo/Jekyll templates
- **Estimé**: 16 heures
- **Dépendances**: 1.3, 6.1
- **Acceptance criteria**:
  - 8+ templates created
  - Each optimized for framework
  - Tests pass for each
- **Status**: 🔴 À faire

#### Task 6.5: Test Service Worker Generation
- [ ] Unit tests pour chaque template
- [ ] Integration tests avec projects réels
- [ ] Performance benchmarks
- [ ] Workbox validation
- **Estimé**: 10 heures
- **Dépendances**: 6.4
- **Acceptance criteria**:
  - Coverage >85%
  - All templates tested
  - Workbox config valid
- **Status**: 🔴 À faire

---

### 7️⃣ Configuration File Support (Week 7-8)

#### Task 7.1: Design Config File Schema
- [ ] Create universal-pwa.config.ts schema
- [ ] Support .js, .json, .yaml formats
- [ ] Design validation schema
- [ ] Create TypeScript types
- **Estimé**: 6 heures
- **Dépendances**: Aucune
- **Acceptance criteria**:
  - Schema documented
  - Types exportable from npm
  - Examples provided
- **Status**: 🔴 À faire

#### Task 7.2: Implement Config Parser
- [ ] Create config loader
- [ ] Support multiple formats (ts, js, json, yaml)
- [ ] Implement validation with zod
- [ ] Error messages clairs
- **Estimé**: 8 heures
- **Dépendances**: 7.1
- **Acceptance criteria**:
  - All formats parsed
  - Validation works
  - Errors helpful
- **Status**: 🔴 À faire

#### Task 7.3: Config Generation Tool
- [ ] Create `universal-pwa init --generate-config`
- [ ] Generate config from project scan
- [ ] Save in project root
- [ ] Make it interactive
- **Estimé**: 6 heures
- **Dépendances**: 7.2
- **Acceptance criteria**:
  - Config générateur works
  - Config file valid
  - Can be used for next run
- **Status**: 🔴 À faire

#### Task 7.4: Integrate Config with CLI/Core
- [ ] Update CLI to read config file
- [ ] Use config defaults
- [ ] Allow CLI args to override config
- [ ] Document precedence
- **Estimé**: 6 heures
- **Dépendances**: 7.2, 7.3
- **Acceptance criteria**:
  - CLI reads config
  - Args override config
  - Precedence clear in docs
- **Status**: 🔴 À faire

#### Task 7.5: Config Documentation
- [ ] Create CONFIGURATION.md
- [ ] Document all config options
- [ ] Provide 10+ examples
- [ ] Troubleshooting section
- **Estimé**: 5 heures
- **Dépendances**: 7.1-7.4
- **Acceptance criteria**:
  - Complete reference
  - Beginner-friendly
- **Status**: 🔴 À faire

---

### 8️⃣ Quality Assurance & Testing (Week 8)

#### Task 8.1: Comprehensive Integration Tests
- [ ] Test Laravel + React SPA
- [ ] Test Symfony + Vue SPA
- [ ] Test Django + React SPA
- [ ] Test WordPress + Static
- [ ] Test Next.js
- [ ] Test Nuxt
- **Estimé**: 12 heures
- **Dépendances**: 2-4
- **Acceptance criteria**:
  - 6 real projects tested
  - All features work
  - No regressions
- **Status**: 🔴 À faire

#### Task 8.2: Performance Benchmarking
- [ ] Benchmark scan time (target <3s)
- [ ] Benchmark generation (target <6s)
- [ ] Benchmark validation (target <2s)
- [ ] Memory usage check
- [ ] Document results
- **Estimé**: 6 heures
- **Dépendances**: All core tasks
- **Acceptance criteria**:
  - Benchmarks meet targets
  - Results documented
  - No memory leaks
- **Status**: 🔴 À faire

#### Task 8.3: Documentation Audit
- [ ] Review all docs for accuracy
- [ ] Update CHANGELOG
- [ ] Create MIGRATION_GUIDE from v1 to v2
- [ ] Update README
- **Estimé**: 8 heures
- **Dépendances**: All tasks
- **Acceptance criteria**:
  - Docs complete & accurate
  - No typos
  - Examples work
- **Status**: 🔴 À faire

#### Task 8.4: Release v2.0.0
- [ ] Update version numbers
- [ ] Generate changelogs
- [ ] Create release notes
- [ ] Tag commit
- [ ] Publish to npm
- [ ] Announce on social media
- **Estimé**: 4 heures
- **Dépendances**: 8.1-8.3
- **Acceptance criteria**:
  - Released on npm
  - GitHub release created
  - Social media posted
- **Status**: 🔴 À faire

---

## 📌 PHASE 2-4: EXPANSION, POLISH & SAAS (Mar - Dec 2026)

*(Tasks 9.1 through 24.5 - 69 additional items)*

[Voir le document TODOLIST_IMPLEMENTATION.md complet pour tous les détails]

---

## 📊 Progress Summary

### Phase 1 Breakdown

```
Week 1-2: Architecture (Tasks 1.1-1.4)
  ✅ 1.1: Design Backend Integration Layer [6/6h] DONE
  ✅ 1.2: Create backends/ directory [4/4h] DONE
  🟡 1.3: Design SW generation pipeline [0/8h] IN PROGRESS
  🔴 1.4: Plan SDK & Backend structure [0/5h] TO DO

Week 2-3: Laravel (Tasks 2.1-2.5)
  🔴 2.1: LaravelIntegration class [0/10h] TO DO
  🔴 2.2: Laravel SW Templates [0/8h] TO DO
  🔴 2.3: Laravel SDK Integration [0/8h] TO DO
  🔴 2.4: End-to-end Laravel Testing [0/8h] TO DO
  🔴 2.5: Laravel Documentation [0/4h] TO DO

Week 3-4: Symfony (Tasks 3.1-3.5)
  🔴 3.1: SymfonyIntegration class [0/10h] TO DO
  🔴 3.2: Symfony SW Templates [0/8h] TO DO
  🔴 3.3: Symfony SDK Integration [0/8h] TO DO
  🔴 3.4: End-to-end Symfony Testing [0/8h] TO DO
  🔴 3.5: Symfony Documentation [0/4h] TO DO

Week 4-5: Django (Tasks 4.1-4.6)
  🔴 4.1: Create packages/sdk-python/ [0/5h] TO DO
  🔴 4.2: DjangoIntegration class [0/10h] TO DO
  🔴 4.3: Django SW Templates [0/8h] TO DO
  🔴 4.4: Flask Support [0/8h] TO DO
  🔴 4.5: End-to-end Python Testing [0/8h] TO DO
  🔴 4.6: Python SDK Documentation [0/4h] TO DO

Week 5-6: Advanced Icons (Tasks 5.1-5.5)
  🔴 5.1: Design Icon Generation System [0/6h] TO DO
  🔴 5.2: Advanced Icon Processor [0/10h] TO DO
  🔴 5.3: Adaptive Icons [0/8h] TO DO
  🔴 5.4: Splash Screens [0/8h] TO DO
  🔴 5.5: Icon Testing & Optimization [0/8h] TO DO

Week 6-7: SW Refactoring (Tasks 6.1-6.5)
  🔴 6.1: Design Advanced Caching [0/6h] TO DO
  🔴 6.2: Route-based Caching [0/10h] TO DO
  🔴 6.3: Smart Invalidation [0/8h] TO DO
  🔴 6.4: Framework-Aware Templates [0/16h] TO DO
  🔴 6.5: SW Testing [0/10h] TO DO

Week 7-8: Config Support (Tasks 7.1-7.5)
  🔴 7.1: Design Config Schema [0/6h] TO DO
  🔴 7.2: Config Parser [0/8h] TO DO
  🔴 7.3: Config Generation Tool [0/6h] TO DO
  🔴 7.4: Config CLI Integration [0/6h] TO DO
  🔴 7.5: Config Documentation [0/5h] TO DO

Week 8: QA & Release (Tasks 8.1-8.4)
  🔴 8.1: Integration Tests [0/12h] TO DO
  🔴 8.2: Performance Benchmarking [0/6h] TO DO
  🔴 8.3: Documentation Audit [0/8h] TO DO
  🔴 8.4: Release v2.0.0 [0/4h] TO DO
```

### Cumulative Effort

```
COMPLETED:  10 hours (Task 1.1 + 1.2)
IN PROGRESS: 8 hours (Task 1.3 - SW generation pipeline)
TODO:       234 hours (Tasks 1.4 through 8.4)
TOTAL:      252 hours (Phase 1)

Estimated timeline:
- Week 1-2: 20h (currently on track - 10h done, 8h in progress, 2h planned)
- Week 3-4: 34h (planning tasks for 2.1-3.5)
- Week 5-6: 34h (icon generation + SW refactoring)
- Week 7-8: 31h (config + QA + release)

Total Phase 1: ~130 hours @ 40h/week = ~3.3 weeks actual
Expected: 8 weeks (conservative timeline with buffer)
```

---

## 🚀 Current Focus: Task 1.3

**Task**: Design Service Worker generation pipeline  
**Status**: 🟡 IN PROGRESS  
**Effort**: 8 hours estimated  
**Next Steps**:

1. **Examine existing code**
   - Review `/packages/core/src/generator/service-worker-generator.ts`
   - Understand current caching strategy implementation
   - Identify extensibility points

2. **Design abstraction**
   - Create `CachingStrategy` interface
   - Define route matching abstraction
   - Plan integration with `BackendIntegration`

3. **Implementation**
   - Refactor generator to support route patterns
   - Implement strategy selection logic
   - Support custom caching strategies

4. **Testing**
   - Create comprehensive test suite
   - Test all strategy combinations
   - Test edge cases and errors

5. **Documentation**
   - Document architecture decisions
   - Create implementation guide
   - Provide usage examples

---

**Next scheduled**: 
- Task 1.4: Plan SDK & Backend structure (5h)
- Task 2.1: Implement LaravelIntegration (10h)

---

**Last updated**: 16 janvier 2026, 09:30  
**Maintained by**: Senior Engineer  
**Next review**: After Task 1.3 completion
