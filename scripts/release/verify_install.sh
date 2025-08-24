#!/bin/bash

# verify_install.sh - GA Release Installation Verification
# Part of the GA Core release process

set -e

echo "🔍 GA Release Installation Verification"
echo "======================================"

# Check core dependencies
echo "📦 Checking core dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found" 
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"

# Check project structure
echo "📁 Verifying project structure..."
required_dirs=("server" "client" "scripts")
for dir in "${required_dirs[@]}"; do
    if [[ ! -d "$dir" ]]; then
        echo "❌ Missing required directory: $dir"
        exit 1
    fi
    echo "✅ Directory: $dir"
done

# Check package files
echo "📄 Checking package.json files..."
required_files=("package.json" "server/package.json" "client/package.json")
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
    echo "✅ File: $file"
done

# Check node_modules installation
echo "🔧 Verifying node_modules..."
if [[ ! -d "node_modules" ]]; then
    echo "❌ Root node_modules not found"
    exit 1
fi

if [[ ! -d "server/node_modules" ]]; then
    echo "❌ Server node_modules not found"
    exit 1
fi

if [[ ! -d "client/node_modules" ]]; then
    echo "❌ Client node_modules not found"
    exit 1
fi

echo "✅ All node_modules directories present"

# Check environment
echo "🌍 Checking environment configuration..."
if [[ ! -f ".env" ]]; then
    echo "⚠️  .env file not found - using .env.example"
    if [[ -f ".env.example" ]]; then
        echo "✅ .env.example found"
    else
        echo "❌ No environment configuration found"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

# Check SBOM generation capability
echo "🔒 Verifying SBOM generation..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    exit 1
fi

echo "✅ npx available for SBOM generation"

# Final verification
echo ""
echo "🎉 GA Release Installation Verification Complete!"
echo "====================================================="
echo "✅ All core components verified"
echo "✅ Ready for GA deployment"
echo ""
echo "Next steps:"
echo "1. Run 'make ga' to execute full GA validation"
echo "2. Review generated sbom.json"
echo "3. Deploy to production environment"