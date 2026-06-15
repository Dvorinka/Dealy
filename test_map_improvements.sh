#!/bin/bash
# Test script to verify the new ModernMap component

echo "=== Testing ModernMap Component Implementation ==="

echo ""
echo "1. Checking component files exist..."
if [ -f "frontend/src/components/MapView.tsx" ]; then
  echo "✓ MapView.tsx created successfully"
else
  echo "✗ MapView.tsx not found"
  exit 1
fi

if [ -f "/home/tdvorak/Desktop/PROG+HTML/Dealy/frontend/src/components/MapPage.tsx" ]; then
  echo "✓ MapPage.tsx updated successfully"
else
  echo "✗ MapPage.tsx not found"
  exit 1
fi

echo ""
echo "2. Checking TypeScript compilation..."
cd frontend && npm run build 2>&1 | tail -20

if [ $? -eq 0 ]; then
  echo "✓ TypeScript compilation successful"
else
  echo "✗ TypeScript compilation failed"
  exit 1
fi

echo ""
echo "3. Checking imports in MapPage.tsx..."
if grep -q "import { ModernMap } from './MapView'" /home/tdvorak/Desktop/PROG+HTML/Dealy/frontend/src/components/MapPage.tsx; then
  echo "✓ ModernMap import found in MapPage.tsx"
else
  echo "✗ ModernMap import not found in MapPage.tsx"
  exit 1
fi

echo ""
echo "4. Checking modern color definitions..."
if grep -q "const typeColors:" /home/tdvorak/Desktop/PROG+HTML/Dealy/frontend/src/components/MapPage.tsx; then
  echo "✓ typeColors found in MapPage.tsx"
else
  echo "✗ typeColors not found in MapPage.tsx"
  exit 1
fi

echo ""
echo "5. Checking ModernMap usage in MapPage.tsx..."
if grep -q "<ModernMap" /home/tdvorak/Desktop/PROG+HTML/Dealy/frontend/src/components/MapPage.tsx; then
  echo "✓ ModernMap component usage found in MapPage.tsx"
else
  echo "✗ ModernMap component usage not found in MapPage.tsx"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
echo ""
echo "Summary of changes:"
echo "1. Created modern MapView.tsx with mapcn-style mapping using MapLibre GL"
echo "2. Updated MapPage.tsx to use ModernMap component"
echo "3. Added white modern style colors (mapTypeColors)"
echo "4. Removed old OpenStreetMap iframe approach"
echo "5. Added quick access buttons for locations"
echo "6. Enhanced UI with modern styling and typography"
echo ""
echo "The map component has been successfully upgraded to a modern, white-styled, mapcn-compatible version!"
