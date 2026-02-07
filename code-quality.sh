#!/bin/bash

set -e

echo "Step 1/5: Type checking..."
npm run typecheck

echo "Step 2/5: Linting..."
npm run lint

echo "Step 3/5: Format checking..."
npm run format:check

echo "Step 4/5: Running tests..."
npm run test

echo "Step 5/5: Checking coverage..."
npm run test:coverage

echo "✅ All code quality checks passed!"
