import { gql } from '@apollo/client';

export const GET_PORTFOLIO = gql`
  query GetPortfolio($tuners: TunersInput) {
    activeMeasuresPortfolio(tuners: $tuners) {
      id
      category
      description
      unattributabilityScore
    }
  }
`;