import { watchlistService } from '../../services/WatchlistService';

const watchlistResolvers = {
  Query: {
    watchlists: async () => {
      return await watchlistService.listWatchlists();
    },
  },
  Mutation: {
    createWatchlist: async (_: any, { input }: any) => {
      return await watchlistService.createWatchlist(input.name);
    },
    addWatchlistRule: async (_: any, { input }: any) => {
      return await watchlistService.addRule(input.watchlistId, input.spec);
    },
  },
};

export default watchlistResolvers;
