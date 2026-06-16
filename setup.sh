#!/bin/bash

# Voxel Editor - Setup & Run Script
# Usage: ./setup.sh

set -e  # Exit on error

echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘          Voxel Editor - Setup & Run Script             â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Function to print section headers
print_header() {
    echo ""
    echo -e "${YELLOW}â–º $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}âœ“ $1${NC}"
}

# Check for npm
print_header "Checking prerequisites"
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm not found. Installing...${NC}"
    npm install -g npm
    print_success "npm installed"
else
    print_success "npm found"
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is required but not installed.${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Option: Clean install
read -p "Do you want to do a clean install? (clears cache, reinstalls deps) [y/N]: " clean_install
if [[ $clean_install =~ ^[Yy]$ ]]; then
    print_header "Cleaning cache and dependencies"
    rm -rf .next node_modules package-lock.json
    print_success "Cleaned"
fi

# Install dependencies
print_header "Installing dependencies"
npm install
print_success "Dependencies installed"

# Build (optional, for production testing)
read -p "Do you want to build for production first? (takes ~30s) [y/N]: " build_prod
if [[ $build_prod =~ ^[Yy]$ ]]; then
    print_header "Building for production"
    npm run build
    print_success "Production build complete"
fi

# Start dev server
print_header "Starting development server"
echo ""
echo -e "${GREEN}âœ“ Ready to go!${NC}"
echo ""
echo "Dev server will start on http://localhost:3000"
echo ""
echo "To access the app:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "  3. Clear cache if still seeing black canvas (see TROUBLESHOOTING.md)"
echo ""
echo "To stop the server: Press Ctrl+C"
echo ""
echo "For help: See README.md or TROUBLESHOOTING.md"
echo ""

# Start the dev server
npm run dev
