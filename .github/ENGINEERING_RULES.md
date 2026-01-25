# 🔒 Engineering Rules - UniversalPWA

**Version:** 1.0  
**Last Updated:** 25 janvier 2026  
**Scope:** Production-ready standards for all contributions

---

## ✅ Pre-requisites for ANY Contribution

### Feature Validation Gate (MANDATORY)

Before pushing ANY code, you **MUST** validate:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

**NO EXCEPTIONS.** If any check fails:
- ❌ **Lint errors** → Fix them, do not bypass
- ❌ **Type errors** → Fix them, do not add `@ts-ignore`
- ❌ **Test failures** → Fix the code or add missing tests

Only when **all three pass** can you commit and push.

---

## 🎯 Core Principles

### 1. Security-First

- **Zero tolerance** for RCE, XSS, injection vulnerabilities
- All dynamic code execution must be guarded with security checks
- Config loading: JSON/YAML by default, TS/JS only with explicit flags
- Path traversal: validate all file paths against a base directory
- Validate all inputs (no pass-through to shell, eval, or dynamic import)

**Examples:**
- ✅ `loadConfig(path, { allowUnsafeConfig: true })` — explicit opt-in
- ❌ `import(userPath)` without validation
- ✅ File size limits (1MB config max)
- ✅ Glob patterns with max results (10K files)

---

### 2. Type Safety (TypeScript Strict)

- `tsconfig.json`: `strict: true` everywhere
- No `any` types without documented exception (`@ts-expect-error` only if unavoidable)
- Prefer interfaces over types for API contracts
- All public functions must have explicit return types

**Validation in CI:** `pnpm typecheck` must pass 100%

---

### 3. Code Quality (ESLint + Prettier)

- ESLint rules strict: no warnings allowed in core/cli/templates
- web-ui: max 50 warnings (React-specific rules)
- demos: excluded from strict checks
- Line length: 100 characters (TypeScript), 88 (Python/Go)

**Validation in CI:** `pnpm lint` must pass 100%

---

### 4. Test Coverage Requirements

#### By Package:

| Package     | Line Coverage | Branch Coverage | Error Scenarios |
| ----------- | ------------- | --------------- | --------------- |
| **core**    | ≥85%          | ≥80%            | ≥90% of error paths |
| **cli**     | ≥80%          | ≥75%            | ≥85% of error paths |
| **templates** | ≥85%        | ≥80%            | ≥85% of error paths |
| **web-ui**  | ≥70%          | ≥65%            | Not strict        |
| **sdks**    | Language-specific (min 75%) | - | - |

#### Test Organization (AAA Pattern):

```typescript
describe("ClassName.methodName()", () => {
  let instance: ClassName;
  let mock: MockType;

  beforeEach(() => {
    // ARRANGE: Setup
    instance = new ClassName();
    mock = vi.mock(...);
  });

  describe("Happy Path", () => {
    it("should do X with valid input", () => {
      // ARRANGE
      const input = { valid: true };
      // ACT
      const result = instance.method(input);
      // ASSERT
      expect(result).toBe(expected);
    });
  });

  describe("Error Scenarios", () => {
    it("should throw on invalid input", () => {
      expect(() => instance.method(null)).toThrow();
    });
  });
});
```

**Validation in CI:** `pnpm test` must pass 100%, coverage checked per package

---

### 5. Performance Baselines

#### CLI Performance Targets:

| Operation | Target | Measurement |
| --------- | ------ | ----------- |
| Startup (--help) | <100ms | `time pnpm universal-pwa --help` |
| Small project (init) | <500ms | <50 files, no assets |
| Medium project (init) | <2s | 50-100 files, 10-20 assets |
| Large project (init) | <5s | 500+ files, 100+ assets |

**Validation:** Performance baseline tests must exist in `performance.baseline.test.ts`

---

### 6. Error Handling Standards

#### Error Codes (exit codes must be consistent):

```
0   = SUCCESS
1   = GENERAL_ERROR (unclassified)
2   = VALIDATION_ERROR (input invalid)
3   = FILE_SYSTEM_ERROR (I/O failure)
4   = NETWORK_ERROR (connectivity)
5   = CONFIG_ERROR (config invalid)
```

#### Error Messages (must be user-friendly):

```typescript
// ✅ Good
throw new Error("Config file not found: /path/to/config.json\nUse: universal-pwa init --config <path>");

// ❌ Bad
throw new Error("ENOENT");
```

**Validation:** All CLI commands must have error handlers with proper exit codes

---

### 7. Security Validation Checklist

Every PR must address:

- [ ] **No RCE vectors**: No `eval()`, no `Function()`, no unsafe `import()` without guards
- [ ] **No path traversal**: All file paths validated against base directory
- [ ] **No XSS**: HTML injection via sanitizer, meta-tags escaped
- [ ] **No unvalidated globs**: Glob patterns limited to 10K results max
- [ ] **No unbounded loops**: All loops have max iterations
- [ ] **No DoS vectors**: Timeouts on all async operations (30s max default)
- [ ] **No secrets in code**: No hardcoded API keys, tokens, or credentials

**Validation:** Security audit checklist in PR description

---

### 8. Documentation Standards

Location: `DOCUMENTATION/` (not in repo, but in PRs if user requests)

Mandatory docs:
- **API changes**: Document in code comments + type hints
- **New features**: Add tests that demonstrate usage
- **Breaking changes**: Changelog entry + migration guide
- **CLI commands**: Help text via `--help`

**No docs required for:**
- Internal refactoring
- Bug fixes (unless behavior changes)
- Test-only changes

---

### 9. Commit Messages (Conventional Commits)

Format: `<type>: <description>`

```
feat: add secure config loader with allowUnsafeConfig flag
fix: reject TS/JS configs by default (security)
refactor: improve icon generator memory usage
chore: update dependencies
test: add error scenario tests for cache poisoning
docs: add security guidelines
```

**Rules:**
- Subject: ≤50 characters, lowercase, no period
- Scope (optional): `(core)`, `(cli)`, `(templates)`
- Body (optional): Explain WHY, not WHAT
- Reference issues: `Fixes #123`, `Closes #456`

**Validation:** Enforced by `commitlint` pre-commit hook

---

### 10. Branch Protection Rules

Before merge to `main`:

- ✅ All checks pass (lint, typecheck, test, coverage)
- ✅ At least 1 code review (for team projects)
- ✅ Commit messages follow conventional commits
- ✅ No committed secrets (checked by `gitleaks`)
- ✅ No `debugger`, `console.log`, or `.only`/`.skip` in tests

---

### 11. Breaking Changes (Semver)

Version bumps:

- **Patch** (x.y.Z): Bug fixes, security patches
- **Minor** (x.Y.z): New features (backward compatible)
- **Major** (X.y.z): Breaking changes, removed features

**For breaking changes:**
- Document in `CHANGELOG.md`
- Provide migration guide
- Tag with `BREAKING CHANGE:` in commit message

---

### 12. Dependency Management

#### Allowed:

- Production deps: Only if required by spec + vetted (no trivial packages)
- Dev deps: Test frameworks (vitest), linters (eslint), formatters (prettier)

#### Forbidden:

- Direct `eval()`, unsafe packages
- Transitive deps with known CVEs (check with `npm audit`)
- Monkeypatching or global mutations

**Validation:** `pnpm audit --prod` must show no HIGH/CRITICAL vulnerabilities

---

### 13. CI/CD Pipeline Enforcement

#### On Every Push:

1. **Lint** (`pnpm -r lint`)
   - Must pass 100% on core/cli/templates
   - Max 50 warnings on web-ui
2. **Typecheck** (`pnpm -r typecheck`)
   - Must pass 100% (strict mode)
3. **Test** (`pnpm -r test`)
   - Must pass 100%
   - Coverage thresholds checked per package
4. **Build** (`pnpm -r build`)
   - Output size checked (core: <500KB)

#### On Release (tag v*):

All of the above + :

1. **Verify build artifacts** exist
2. **Run security audit** (`pnpm audit --prod`)
3. **Publish packages** (npm/GitHub releases)

**Failure = No merge, no release**

---

### 14. Quick Reference: Pre-Push Checklist

```
☐ Ran: pnpm lint && pnpm typecheck && pnpm test (ALL PASS)
☐ Added tests for new code
☐ Updated DOCUMENTATION if needed
☐ No console.log/debugger left
☐ No @ts-ignore without justification
☐ Commit message follows format: <type>: <description>
☐ No secrets or hardcoded values
☐ Performance baseline OK (if applicable)
☐ Security checklist completed
```

**TL;DR:** If `pnpm lint && pnpm typecheck && pnpm test` doesn't pass 100%, DO NOT PUSH.

---

### 15. Manual Overrides (Emergency Only)

If a rule must be bypassed:

1. **Document why** in code comment with `TODO:` + ticket number
2. **Create GitHub issue** to fix properly
3. **Get team approval** (code review)
4. **Set removal deadline** (next sprint)

**Examples:**

```typescript
// TODO: #456 - Replace @ts-expect-error with proper typing
// @ts-expect-error - workbox-build types incomplete
const result = await generateSW(config);

// FIXME: Remove console in #789 - temporary debug log
console.log("DEBUG: config loaded:", config);
```

---

## 📋 CI/CD Workflow Rules

See `.github/workflows/`:

- **ci.yml**: Runs on manual trigger (workflow_dispatch)
- **release.yml**: Runs on version tags (v*)

Both workflows enforce:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- Coverage validation

---

## 🚨 Violations & Remediation

| Violation | Severity | Action |
| --------- | -------- | ------ |
| Push without lint/test passing | 🔴 BLOCKER | Revert immediately + fix |
| Security vulnerability | 🔴 BLOCKER | Revert + hotfix |
| Breaking change undocumented | 🟡 WARNING | Add docs before merge |
| Missing tests | 🟡 WARNING | Add tests or reduce scope |
| Type errors (@ts-ignore) | 🟡 WARNING | Fix types properly |
| Performance regression | 🟠 CAUTION | Profile + optimize |

---

## 📞 Questions?

- **Setup issues**: See `README.md`
- **Security**: See `DOCUMENTATION/SECURITY_GUIDE.md` (if exists)
- **Performance**: Check `DOCUMENTATION/PERFORMANCE_GUIDE.md`
- **Testing**: See `DOCUMENTATION/TEST_PATTERNS.md`
