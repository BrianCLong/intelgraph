# GraphQL API

```
type ScreeningResult { subjectId: ID!, entryId: ID!, score: Float!, reasons: [String!]!, matchedFields: [String!]!, decision: String! }

input SubjectInput { id: ID!, name: String! }

type Query { screeningResults: [ScreeningResult!]! }

type Mutation { runScreening(subjects: [SubjectInput!]!): [ScreeningResult!]! }
```
