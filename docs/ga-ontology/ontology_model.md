# Ontology Model

Base ontology defines core classes and properties:

- **Person** — name, email, employedBy -> Org
- **Org** — name, industry
- **Event** — label, occursAt -> Location
- **Location** — name, geo
- **Document** — title, author -> Person
- **Account** — identifier, owner -> Person
- **Transaction** — amount, currency, from -> Account, to -> Account

Each version is immutable; changes are proposed via governance and released with semantic versioning.
