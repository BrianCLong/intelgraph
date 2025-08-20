class TileService {
  getTileURL(z: number, x: number, y: number): string {
    return `/tiles/${z}/${x}/${y}.pbf`;
  }
}

export default new TileService();
