#!/bin/bash

# Script de publication pour UniversalPWA
# Usage: ./scripts/publish.sh [templates|core|cli|all]

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Publication UniversalPWA sur NPM${NC}\n"

# Vérifier que l'utilisateur est connecté à NPM
if ! npm whoami &> /dev/null; then
  echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à NPM${NC}"
  echo "Exécutez: npm login"
  exit 1
fi

echo -e "${GREEN}✓ Connecté à NPM en tant que: $(npm whoami)${NC}\n"

# Build tous les packages
echo -e "${BLUE}📦 Build des packages...${NC}"
pnpm build

# Lint
echo -e "${BLUE}🔍 Vérification du lint...${NC}"
pnpm lint

# Tests
echo -e "${BLUE}🧪 Exécution des tests...${NC}"
pnpm test

# Déterminer quel package publier
PACKAGE=${1:-all}

case $PACKAGE in
  templates)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-templates...${NC}"
    cd packages/templates
    pnpm publish --access public --no-git-checks
    ;;
  core)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-core...${NC}"
    cd packages/core
    pnpm publish --access public --no-git-checks
    ;;
  cli)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-cli...${NC}"
    cd packages/cli
    pnpm publish --access public --no-git-checks
    ;;
  all)
    echo -e "${BLUE}📤 Publication de tous les packages (dans l'ordre)...${NC}\n"
    
    echo -e "${GREEN}1/3: @julien-lin/universal-pwa-templates${NC}"
    cd packages/templates
    pnpm publish --access public --no-git-checks
    cd ../..
    
    echo -e "${GREEN}2/3: @julien-lin/universal-pwa-core${NC}"
    cd packages/core
    pnpm publish --access public --no-git-checks
    cd ../..
    
    echo -e "${GREEN}3/3: @julien-lin/universal-pwa-cli${NC}"
    cd packages/cli
    pnpm publish --access public --no-git-checks
    cd ../..
    ;;
  *)
    echo -e "${YELLOW}Usage: ./scripts/publish.sh [templates|core|cli|all]${NC}"
    exit 1
    ;;
esac

echo -e "\n${GREEN}✅ Publication terminée avec succès!${NC}"
echo -e "${BLUE}Vérifiez sur: https://www.npmjs.com/~julien-lin${NC}"

