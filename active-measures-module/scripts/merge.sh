#!/bin/bash
cp -r src/* ../server/src/active-measures/
cp client/components/* ../client/src/components/
cp client/store/* ../client/src/store/
echo "Extend GraphQL: import activeMeasures from './active-measures/graphql';" >> ../server/src/graphql/index.ts
npm install
echo "Merge complete. Test with npm test."