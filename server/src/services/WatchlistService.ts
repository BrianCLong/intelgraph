import { v4 as uuidv4 } from 'uuid';

export interface WatchlistRule {
  id: string;
  spec: any;
}

export interface Watchlist {
  id: string;
  name: string;
  rules: WatchlistRule[];
}

export class WatchlistService {
  private watchlists: Watchlist[] = [];

  async createWatchlist(name: string): Promise<Watchlist> {
    const watchlist: Watchlist = { id: uuidv4(), name, rules: [] };
    this.watchlists.push(watchlist);
    return watchlist;
  }

  async listWatchlists(): Promise<Watchlist[]> {
    return this.watchlists;
  }

  async addRule(watchlistId: string, spec: any): Promise<WatchlistRule | null> {
    const watchlist = this.watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) return null;
    const rule: WatchlistRule = { id: uuidv4(), spec };
    watchlist.rules.push(rule);
    return rule;
  }
}

export const watchlistService = new WatchlistService();
