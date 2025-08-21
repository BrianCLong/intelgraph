import HybridSearchService from '../../services/HybridSearchService';

const service = new HybridSearchService();

export default {
  Query: {
    async search(_: any, { query, filters, topK, mode }) {
      return service.search(query, { filters, topK, mode });
    },
  },
};
