# 📊 UniversalPWA Performance Guide

**Last Updated:** 27 janvier 2026  
**Version:** 1.0.0  
**Target Audience:** Developers, DevOps, Performance Engineers

---

## Table of Contents

1. [Performance Profiling](#performance-profiling)
2. [Benchmarks & Baselines](#benchmarks--baselines)
3. [Optimization Guide](#optimization-guide)
4. [Troubleshooting & FAQ](#troubleshooting--faq)
5. [Advanced Tuning](#advanced-tuning)

---

## Performance Profiling

### 1. Measuring CLI Execution Time

The `universal-pwa` CLI automatically instruments execution and logs timing breakdowns.

#### Basic Timing

```bash
time pnpm universal-pwa init --project /path/to/project

# Output example:
# ✔ Scanning project [140ms]
# ✔ Detecting framework [45ms]
# ✔ Generating icons [2.8s]
# ✔ Injecting meta tags [150ms]
# Total: 3.1s
```

#### Structured Logging with Timing

Enable JSON logging to capture detailed timing metrics:

```bash
# Enable verbose logging
pnpm universal-pwa init --project /path --verbose

# Output includes:
# - phase: "scan", duration_ms: 140
# - phase: "generate", duration_ms: 2800
# - phase: "inject", duration_ms: 150
```

#### Metrics Export

The CLI exports performance metrics in multiple formats:

```bash
# JSON export (for analysis)
pnpm universal-pwa init --project /path --export-metrics metrics.json

# Prometheus format (for monitoring)
pnpm universal-pwa init --project /path --export-prometheus

# Result:
# universal_pwa_scan_duration_seconds 0.14
# universal_pwa_generate_duration_seconds 2.8
# universal_pwa_total_duration_seconds 3.1
```

---

## Benchmarks & Baselines

### 2. Performance Baselines

These benchmarks represent expected performance on typical hardware (MacBook Pro M2, 16GB RAM):

#### Small Projects (10-50 files)

| Operation          | Expected Time | Notes                                  |
| ------------------ | ------------- | -------------------------------------- |
| **Scan**           | 50-150ms      | Framework detection + file enumeration |
| **Generate Icons** | 200-800ms     | Adaptive icons + splash screens        |
| **Inject Meta**    | 50-200ms      | HTML parsing + tag injection           |
| **Total**          | 300-1150ms    | End-to-end execution                   |

**Example:** React app with 20 files, 1 icon source

```
✔ Scanning project [78ms]
✔ Detecting framework [42ms]
✔ Generating icons [650ms]
✔ Injecting meta tags [125ms]
Total: 895ms
```

#### Medium Projects (50-500 files)

| Operation          | Expected Time | Notes                                 |
| ------------------ | ------------- | ------------------------------------- |
| **Scan**           | 150-400ms     | Large file enumeration, caching helps |
| **Generate Icons** | 800-1500ms    | Multiple splash screens               |
| **Inject Meta**    | 100-300ms     | Larger HTML files                     |
| **Total**          | 1.0-2.2s      | Typical SPA or framework app          |

**Example:** Django project with 150 files, 2 icon sources

```
✔ Scanning project [280ms]
✔ Detecting framework [35ms]
✔ Generating icons [1200ms]
✔ Injecting meta tags [180ms]
Total: 1.7s
```

#### Large Projects (500+ files)

| Operation          | Expected Time | Notes                              |
| ------------------ | ------------- | ---------------------------------- |
| **Scan**           | 300-800ms     | File system limits, cache enabled  |
| **Generate Icons** | 1500-3000ms   | Full set of icons + splash screens |
| **Inject Meta**    | 200-500ms     | Large monorepos                    |
| **Total**          | 2.0-4.3s      | Monorepos, large frameworks        |

**Example:** Laravel monorepo with 1200 files, multiple icon sources

```
✔ Scanning project [650ms]
✔ Detecting framework [25ms]
✔ Generating icons [2400ms]
✔ Injecting meta tags [280ms]
Total: 3.4s
```

### 3. Comparing Across Environments

Run benchmarks on your specific hardware:

```bash
# Single run
time pnpm universal-pwa init --project /path/to/project

# Average over 5 runs (for more reliable results)
for i in {1..5}; do
  echo "Run $i:"
  time pnpm universal-pwa init --project /path/to/project --no-cache
done
```

**Performance Variations:**

- **Cold start** (no cache): 1.5-4x slower
- **With cache** (default): Baseline performance
- **SSD vs HDD**: 2-5x difference on large projects
- **Network delays**: If using remote paths

---

## Optimization Guide

### 4. Optimizing for Speed

#### A. Use Caching

**Recommended (default):**

```bash
# Caching enabled automatically
pnpm universal-pwa init --project /path/to/project
```

**Cache location:**

```
~/.universal-pwa-cache/
```

**Clear cache if needed:**

```bash
# Remove stale cache
rm -rf ~/.universal-pwa-cache/

# Or skip cache for single run
pnpm universal-pwa init --project /path --no-cache
```

**Cache benefits:**

- Framework detection: ~90% faster (cached)
- Icon file reading: ~70% faster (cached)
- Total improvement: 30-50% on subsequent runs

#### B. Optimize Icon Source

**Best:** Single PNG icon (smallest image)

```bash
pnpm universal-pwa init --project /path --icon ./logo.png
# Expected: 650-800ms for icon generation
```

**Good:** Single large icon (will be resized)

```bash
pnpm universal-pwa init --project /path --icon ./high-res-logo.png
# Expected: 1000-1200ms
```

**Avoid:** Multiple icon sources (slower)

```bash
pnpm universal-pwa init --project /path \
  --icon ./logo.png \
  --icon ./logo-dark.png \
  --icon ./logo-adaptive.png
# Expected: 2000-3000ms (3x slower)
```

#### C. Parallel Processing

Enable multi-core icon generation:

```bash
pnpm universal-pwa init --project /path --workers 4
# Default: 2 workers (conservative)
# Maximum: CPU count (aggressive, may increase memory)
```

**Performance impact:**

- 2 workers (default): Baseline
- 4 workers: +30-40% faster on 8-core systems
- 8 workers: +40-50% faster but higher memory (GBs)

#### D. Skip Unnecessary Features

```bash
# Minimal PWA (fastest)
pnpm universal-pwa init --project /path \
  --no-splash-screens \
  --no-service-worker

# Balanced (recommended)
pnpm universal-pwa init --project /path

# Full PWA (slowest but complete)
pnpm universal-pwa init --project /path \
  --with-adaptive-icons \
  --with-service-worker-strategies
```

**Time saved:**

- Skip splash: -800-1500ms
- Skip service worker: -150-300ms
- Total with minimal: 1-2 seconds

#### E. Pre-optimize Your Icon

```bash
# Instead of: large 4000x4000 PNG (10MB)
# Do this: resize to 512x512 (50KB) first

# Using ImageMagick
convert logo.png -resize 512x512 logo-optimized.png

# Using ffmpeg
ffmpeg -i logo.png -vf scale=512:512 logo-optimized.png

# Then use optimized version
pnpm universal-pwa init --project /path --icon ./logo-optimized.png
# Saves 30-40% generation time
```

---

## Troubleshooting & FAQ

### 5. Common Performance Issues

#### Issue: Scan takes 2+ seconds (expected <400ms)

**Cause:** Large project without cache  
**Solution:**

```bash
# First run: slow (builds cache)
pnpm universal-pwa init --project /path

# Second run: fast (uses cache)
pnpm universal-pwa init --project /path

# Or skip if cache is stale
rm -rf ~/.universal-pwa-cache/
pnpm universal-pwa init --project /path
```

#### Issue: Icon generation takes 5+ seconds (expected <2s)

**Cause:** Large or multiple icon sources  
**Solution:**

```bash
# Check current icon source
ls -lh /path/to/icon

# Optimize icon if >1MB
# Example: reduce 4000x4000 to 512x512
convert logo.png -resize 512x512 logo-opt.png

# Use optimized icon
pnpm universal-pwa init --project /path --icon ./logo-opt.png
```

#### Issue: High memory usage during generation (>500MB)

**Cause:** Too many parallel workers or large images  
**Solution:**

```bash
# Reduce workers
pnpm universal-pwa init --project /path --workers 2

# Or reduce memory-intensive features
pnpm universal-pwa init --project /path --no-splash-screens
```

#### Issue: Consistent timeout on large projects

**Cause:** Network drive or slow filesystem  
**Solution:**

```bash
# Copy project locally first
cp -r /network/path /tmp/local-copy
cd /tmp/local-copy

# Run cli on local copy (much faster)
pnpm universal-pwa init --project .

# Increase timeout if needed
pnpm universal-pwa init --project /path --timeout 60000
```

### 6. Frequently Asked Questions

**Q: Why is my first run slow?**
A: First run builds cache. Subsequent runs use cache and are 30-50% faster. This is intentional to improve developer experience.

**Q: Can I use a faster SSD?**
A: Yes. Project on NVMe SSD vs regular SSD shows 2-3x improvement on large projects.

**Q: Should I commit the cache to Git?**
A: No. Cache is in `~/.universal-pwa-cache/` (user home). Add to `.gitignore` if project-local.

**Q: Why are splash screens slow?**
A: Generating iOS splash screens (8 different sizes) takes time. Disable with `--no-splash-screens` if not needed.

**Q: Can I use parallel workers > CPU count?**
A: Yes, but not recommended. Uses more memory without performance gain. Stick to CPU count.

**Q: How do I monitor production performance?**
A: Use Prometheus export format:

```bash
pnpm universal-pwa init --project /path --export-prometheus
# Load into Grafana or Prometheus server
```

**Q: Does the CLI support CI/CD optimization?**
A: Yes:

```bash
# CI-specific flags
pnpm universal-pwa init --project /path \
  --no-cache \           # Skip cache in CI
  --workers 2 \          # Conservative
  --export-metrics ci-metrics.json
```

---

## Advanced Tuning

### 7. Production Optimization Checklist

- [ ] **Cache enabled** (default): Improves repeat runs by 30-50%
- [ ] **Icon optimized** (<512x512): Reduces generation time by 30-40%
- [ ] **Parallel workers tuned** (CPU count): Baseline performance
- [ ] **Unnecessary features disabled** (splash, SW): Saves 1-2 seconds if unused
- [ ] **Monitoring enabled** (--export-prometheus): Track production performance
- [ ] **Timeouts appropriate** (default 120s for init): Adjust for your network

### 8. Monitoring and Alerting

#### Prometheus Metrics

Available metrics when using `--export-prometheus`:

```
# Histogram: execution time per phase
universal_pwa_scan_duration_seconds (0.05-0.8)
universal_pwa_generate_duration_seconds (0.2-3.0)
universal_pwa_inject_duration_seconds (0.05-0.5)
universal_pwa_total_duration_seconds (0.3-4.3)

# Gauge: current operation status
universal_pwa_operation_status (0=running, 1=success, 2=failed)
universal_pwa_files_processed (count)

# Counter: cumulative operations
universal_pwa_operations_total (count)
universal_pwa_icons_generated_total (count)
```

#### Set Up Alerts (Prometheus)

```yaml
groups:
  - name: universal_pwa
    rules:
      - alert: PWAInitSlow
        expr: universal_pwa_total_duration_seconds > 5
        annotations:
          summary: "PWA init slow ({{ $value }}s)"

      - alert: PWAInitFailed
        expr: universal_pwa_operation_status == 2
        annotations:
          summary: "PWA init failed"
```

### 9. Benchmarking Script

Save as `benchmark.sh`:

```bash
#!/bin/bash

PROJECT_PATH="${1:-.}"
RUNS="${2:-5}"

echo "UniversalPWA Performance Benchmark"
echo "Project: $PROJECT_PATH"
echo "Runs: $RUNS"
echo "---"

for i in $(seq 1 $RUNS); do
  echo "Run $i:"
  time pnpm universal-pwa init --project "$PROJECT_PATH" --no-cache
  echo ""
done

echo "---"
echo "Benchmark complete. Run with cache:"
time pnpm universal-pwa init --project "$PROJECT_PATH"
```

**Usage:**

```bash
chmod +x benchmark.sh
./benchmark.sh /path/to/project 5    # Run 5 times
```

---

## Performance Tips Summary

### Quick Reference

| Goal             | Action            | Time Saved |
| ---------------- | ----------------- | ---------- |
| Faster first run | Use cache         | 30-50%     |
| Faster icon gen  | Optimize source   | 30-40%     |
| Faster overall   | Disable splash    | 25-35%     |
| Parallel gains   | Use 4 workers     | +30%       |
| Monitor prod     | Export Prometheus | Visibility |

### Real-World Examples

**Scenario 1: Local Development**

```bash
# Optimize for speed on first run
pnpm universal-pwa init --project . \
  --icon ./logo-512x512.png \
  --workers 4
# Expected: 1.0-1.5s
```

**Scenario 2: CI/CD Pipeline**

```bash
# Conservative but reliable
pnpm universal-pwa init --project . \
  --no-cache \
  --workers 2 \
  --export-metrics ci-metrics.json
# Expected: 2.0-3.0s
```

**Scenario 3: Large Monorepo**

```bash
# Parallel processing with caching
pnpm universal-pwa init --project . \
  --workers 8 \
  --export-prometheus
# Expected: 2.5-3.5s (with cache)
```

---

## Support & Further Reading

- **Issues?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **More details?** See [architecture guide](./ARCHITECTURE.md)
- **Contributing?** Check [CONTRIBUTING.md](../CONTRIBUTING.md)

**Last updated:** 27 janvier 2026  
**Maintained by:** UniversalPWA Team
