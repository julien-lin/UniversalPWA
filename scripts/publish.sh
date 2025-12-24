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

# Demander l'OTP si nécessaire (pour 2FA)
OTP=""
if npm whoami &> /dev/null; then
  echo -e "${YELLOW}💡 Si vous avez activé l'authentification à deux facteurs (2FA), vous devrez fournir un OTP${NC}"
  read -p "Code OTP (laissez vide si pas de 2FA): " OTP
fi

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

# Construire la commande de publication avec OTP si fourni
PUBLISH_CMD="pnpm publish --access public --no-git-checks"
if [ -n "$OTP" ]; then
  PUBLISH_CMD="$PUBLISH_CMD --otp=$OTP"
fi

case $PACKAGE in
  templates)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-templates...${NC}"
    cd packages/templates
    $PUBLISH_CMD
    ;;
  core)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-core...${NC}"
    cd packages/core
    $PUBLISH_CMD
    ;;
  cli)
    echo -e "${BLUE}📤 Publication de @julien-lin/universal-pwa-cli...${NC}"
    cd packages/cli
    $PUBLISH_CMD
    ;;
  all)
    echo -e "${BLUE}📤 Publication de tous les packages (dans l'ordre)...${NC}\n"
    
    echo -e "${GREEN}1/3: @julien-lin/universal-pwa-templates${NC}"
    cd packages/templates
    $PUBLISH_CMD
    cd ../..
    
    echo -e "${GREEN}2/3: @julien-lin/universal-pwa-core${NC}"
    cd packages/core
    $PUBLISH_CMD
    cd ../..
    
    echo -e "${GREEN}3/3: @julien-lin/universal-pwa-cli${NC}"
    cd packages/cli
    $PUBLISH_CMD
    cd ../..
    ;;
  *)
    echo -e "${YELLOW}Usage: ./scripts/publish.sh [templates|core|cli|all]${NC}"
    exit 1
    ;;
esac

echo -e "\n${GREEN}✅ Publication terminée avec succès!${NC}"
echo -e "${BLUE}Vérifiez sur: https://www.npmjs.com/~julien-lin${NC}"

