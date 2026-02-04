#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Express.js Docker Management${NC}"
echo ""

case "$1" in
  dev)
    echo -e "${YELLOW}Starting development environment...${NC}"
    docker compose --profile dev up --build
    ;;
  dev:detach)
    echo -e "${YELLOW}Starting development environment (detached)...${NC}"
    docker compose --profile dev up --build -d
    ;;
  prod)
    echo -e "${YELLOW}Starting production environment...${NC}"
    docker compose -f docker-compose.yml up --build
    ;;
  prod:detach)
    echo -e "${YELLOW}Starting production environment (detached)...${NC}"
    docker compose -f docker-compose.yml up --build -d
    ;;
  down)
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker compose --profile dev down
    ;;
  logs)
    docker compose logs -f ${2:-app}
    ;;
  shell)
    echo -e "${YELLOW}Opening shell in app container...${NC}"
    docker compose exec app sh
    ;;
  redis-cli)
    echo -e "${YELLOW}Opening Redis CLI...${NC}"
    docker compose exec redis redis-cli
    ;;
  clean)
    echo -e "${RED}Removing all containers, volumes, and images...${NC}"
    docker compose --profile dev down -v --rmi local
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 {dev|dev:detach|prod|prod:detach|down|logs|shell|redis-cli|clean|status}"
    echo ""
    echo "Commands:"
    echo "  dev          - Start development with hot reload + Redis Commander"
    echo "  dev:detach   - Same as dev but detached"
    echo "  prod         - Start production environment"
    echo "  prod:detach  - Same as prod but detached"
    echo "  down         - Stop all containers"
    echo "  logs [svc]   - View logs (default: app)"
    echo "  shell        - Open shell in app container"
    echo "  redis-cli    - Open Redis CLI"
    echo "  clean        - Remove containers, volumes, images"
    echo "  status       - Show container status"
    exit 1
    ;;
esac
