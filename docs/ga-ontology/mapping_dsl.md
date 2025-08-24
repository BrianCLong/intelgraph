# Mapping DSL

Mappings connect external schemas to ontology classes and properties.

```
source:
  system: "people.csv"
  entity: "row"
target:
  class: "Person"
rules:
  - set:
      property: "Person.name"
      from: "row.full_name"
      transforms: [trim, title]
```
