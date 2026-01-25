# 🚀 GitHub Workflows & Engineering Rules

This directory contains CI/CD workflows and engineering guidelines for UniversalPWA.

## 📋 Files

### `.github/ENGINEERING_RULES.md`

**Comprehensive engineering standards** for all contributions.

Key sections:

- **Pre-requisites**: `pnpm lint && pnpm typecheck && pnpm test` (MANDATORY)
- **Core Principles**: Security, type safety, code quality, testing
- **Coverage Requirements**: By-package targets (core: 85%, cli: 80%, etc.)
- **Performance Baselines**: CLI startup <100ms, small project init <500ms
- **Error Handling**: Standard error codes and user-friendly messages
- **Commit Messages**: Conventional Commits format
- **Breaking Changes**: Semver, documentation requirements
- **Pre-Push Checklist**: Quick reference for developers

**READ THIS FIRST** if contributing to UniversalPWA.

---

### `.github/workflows/ci.yml`

**Continuous Integration workflow** (manual trigger).

**Jobs:**

1. **validate** (mandatory)
   - ✅ Step 1/3: Lint (`pnpm -r lint`)
   - ✅ Step 2/3: Typecheck (`pnpm -r typecheck`)
   - ✅ Step 3/3: Test + Coverage (`pnpm -r test`)
   - Runs on Node.js 20 & 22, macOS & Ubuntu
   - **Fails if ANY step fails** (no tolerance)

2. **build** (runs only if validate passes)
   - Builds all packages (`pnpm -r build`)
   - Verifies build artifacts exist
   - Checks core bundle size (<500KB)
   - Uploads coverage to Codecov

3. **security** (informational, doesn't block)
   - Runs `pnpm audit --prod`
   - Reports vulnerabilities

**Trigger:** Manual via GitHub Actions > CI > Run workflow

---

### `.github/workflows/release.yml`

**Release & publish workflow** (triggers on version tags).

**Jobs:**

1. **validate** (mandatory before release)
   - All 3 checks must pass (lint, typecheck, test)
   - **Blocks release if ANY check fails**

2. **build-and-release** (runs only if validate passes)
   - Builds all packages
   - Verifies artifacts
   - Runs security audit (warning only)
   - Publishes to npm (core, cli, templates, web-ui)
   - Creates GitHub Release with validation status

**Trigger:** Push version tag (e.g., `git tag v1.0.0 && git push --tags`)

---

## ⚡ Quick Start for Developers

### Before Pushing Code

```bash
# 1. Run ALL three checks (MANDATORY)
pnpm lint && pnpm typecheck && pnpm test

# 2. Commit with conventional message
git commit -m "feat: add secure config loader"

# 3. Push
git push
```

### Before Release

```bash
# 1. Ensure all tests pass locally
pnpm lint && pnpm typecheck && pnpm test

# 2. Create version tag
git tag v1.0.0

# 3. Push tag (triggers release workflow)
git push --tags
```

---

## 📊 Validation Requirements

| Check           | Command             | Status    | Tolerance                                 |
| --------------- | ------------------- | --------- | ----------------------------------------- |
| **Lint**        | `pnpm -r lint`      | Must pass | 0 errors (max 50 warnings in web-ui)      |
| **Typecheck**   | `pnpm -r typecheck` | Must pass | 0 errors (strict mode)                    |
| **Tests**       | `pnpm -r test`      | Must pass | 100% tests passing                        |
| **Coverage**    | Automatic           | Checked   | Per-package targets (core: 85%, cli: 80%) |
| **Build**       | `pnpm -r build`     | Must pass | 0 errors                                  |
| **Bundle Size** | Automatic           | Checked   | core: <500KB                              |

---

## 🔒 Security Checklist

Every PR should verify:

- [ ] No RCE vectors (eval, unsafe import, etc.)
- [ ] No path traversal (all paths validated)
- [ ] No XSS (HTML escaped, meta-tags sanitized)
- [ ] No unvalidated globs (max 10K results)
- [ ] No unbounded loops (all loops have limits)
- [ ] No DoS vectors (timeouts on async ops)
- [ ] No secrets in code

See `.github/ENGINEERING_RULES.md` section 7 for details.

---

## 📚 Coverage Targets

| Package       | Line | Branch | Error Scenarios |
| ------------- | ---- | ------ | --------------- |
| **core**      | ≥85% | ≥80%   | ≥90%            |
| **cli**       | ≥80% | ≥75%   | ≥85%            |
| **templates** | ≥85% | ≥80%   | ≥85%            |
| **web-ui**    | ≥70% | ≥65%   | Not strict      |

Coverage is automatically checked in CI.

---

## 🚨 If Checks Fail

### Lint errors

```bash
pnpm -r lint -- --fix  # Auto-fix some issues
# Manual fixes for others
```

### Typecheck errors

```bash
pnpm -r typecheck
# Fix type issues (do not add @ts-ignore)
```

### Test failures

```bash
pnpm -r test
# Either fix the code or add missing tests
```

### Coverage gaps

```bash
pnpm -r test -- --coverage
# Add tests for uncovered lines/branches
```

---

## 📖 References

- **Engineering Rules**: [ENGINEERING_RULES.md](./ENGINEERING_RULES.md)
- **Test Patterns**: [../../DOCUMENTATION/TEST_PATTERNS.md](../../DOCUMENTATION/TEST_PATTERNS.md)
- **Security Guide**: [../../DOCUMENTATION/PLAN_ACTION_SECURITE_PERFORMANCE.md](../../DOCUMENTATION/PLAN_ACTION_SECURITE_PERFORMANCE.md)
- **Main README**: [../../README.md](../../README.md)

---

## 💡 Tips

**Local validation before push:**

```bash
# Run all checks like CI does
pnpm lint && pnpm typecheck && pnpm test

# Or individually:
pnpm -r lint
pnpm -r typecheck
pnpm -r test -- --coverage
```

**View CI status:**

- GitHub Actions tab: https://github.com/julien-lin/UniversalPWA/actions

**Debugging failing tests:**

```bash
# Run specific test file
pnpm -r test -- src/config/loader.test.ts

# Run with verbose output
pnpm -r test -- --reporter=verbose

# Run in watch mode
pnpm -r test -- --watch
```

---

**Last Updated:** 25 janvier 2026  
**Version:** 1.0
