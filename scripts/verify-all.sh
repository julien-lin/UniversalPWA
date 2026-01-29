#!/bin/bash

# UniversalPWA - Complete verification script
# Runs all checks: build, typecheck, lint, and test

set -e

echo "🔍 Starting UniversalPWA verification..."
echo ""

echo "📦 Building packages..."
pnpm build
echo "✅ Build completed"
echo ""

echo "🔎 Type checking..."
pnpm typecheck
echo "✅ Type check completed"
echo ""

echo "✨ Linting..."
pnpm lint
echo "✅ Linting completed"
echo ""

echo "🧪 Running tests..."
pnpm test
echo "✅ Tests completed"
echo ""

echo "✨ All verification checks passed!"
