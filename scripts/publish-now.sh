#!/bin/bash

# Script de publication rapide pour UniversalPWA
# Usage: ./scripts/publish-now.sh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Publication UniversalPWA sur NPM${NC}\n"

# Vérifier l'authentification
if ! npm whoami &> /dev/null; then
  echo -e "${RED}❌ Vous n'êtes pas connecté à NPM${NC}"
  echo -e "${YELLOW}Exécutez: npm login${NC}"
  exit 1
fi

USER=$(npm whoami)
echo -e "${GREEN}✓ Connecté en tant que: ${USER}${NC}"

# Vérifier l'organisation
if ! npm org ls universal-pwa &> /dev/null; then
  echo -e "${YELLOW}⚠️  Vérifiez que vous êtes membre de l'organisation 'universal-pwa'${NC}"
else
  echo -e "${GREEN}✓ Membre de l'organisation 'universal-pwa'${NC}"
fi

echo ""

# Build
echo -e "${BLUE}📦 Build des packages...${NC}"
pnpm build

echo ""

# Publication dans l'ordre
echo -e "${BLUE}📤 Publication des packages...${NC}\n"

echo -e "${GREEN}[1/3] @universal-pwa/templates${NC}"
cd packages/templates
pnpm publish --access public --no-git-checks
cd ../..

echo -e "${GREEN}[2/3] @universal-pwa/core${NC}"
cd packages/core
pnpm publish --access public --no-git-checks
cd ../..

echo -e "${GREEN}[3/3] @universal-pwa/cli${NC}"
cd packages/cli
pnpm publish --access public --no-git-checks
cd ../..

echo ""
echo -e "${GREEN}✅ Publication terminée avec succès!${NC}"
echo ""
echo -e "${BLUE}Vérifiez sur:${NC}"
echo -e "  https://www.npmjs.com/package/@universal-pwa/templates"
echo -e "  https://www.npmjs.com/package/@universal-pwa/core"
echo -e "  https://www.npmjs.com/package/@universal-pwa/cli"
echo ""
echo -e "${BLUE}Testez l'installation:${NC}"
echo -e "  npm install -g @universal-pwa/cli"
echo -e "  universal-pwa --version"


