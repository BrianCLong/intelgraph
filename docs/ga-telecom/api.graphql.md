# GraphQL API

The gateway exposes mutations to trigger sector builds and co-travel detection.

```graphql
mutation Build($csv: String!) {
  buildSectors(towerCsv: $csv) { sectors { towerId sectorNo polygonWkt } }
}
```
