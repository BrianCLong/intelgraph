const gql = require('graphql-tag');

const geoTypeDefs = gql`
  scalar DateTime
  scalar JSON
  scalar Upload

  type Point {
    latitude: Float!
    longitude: Float!
  }

  input PointInput {
    latitude: Float!
    longitude: Float!
  }

  input GeoShape {
    type: String!
    coordinates: JSON!
  }

  input TimeRange {
    from: DateTime!
    to: DateTime!
  }

  type GeoResult {
    id: ID!
    type: String!
    location: Point
    properties: JSON
  }

  extend type Query {
    geoSearch(area: GeoShape!, types: [String!], time: TimeRange): [GeoResult!]
  }

  extend type Mutation {
    importGeo(file: Upload!, format: String!, mapping: JSON!): JSON
    startGeoRoute(from: PointInput!, to: PointInput!, constraints: JSON): JSON
  }
`;

module.exports = { geoTypeDefs };
