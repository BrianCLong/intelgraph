const GeointService = require('../../services/GeointService.js');

const geoResolvers = {
  Query: {
    geoSearch: async (_, { area, types, time }, { services }) => {
      const geoint = services?.geoint || new GeointService();
      return geoint.geoSearch(area, types, time);
    },
  },
  Mutation: {
    importGeo: async (_, args, { services }) => {
      const geoint = services?.geoint || new GeointService();
      return geoint.importGeo(args);
    },
    startGeoRoute: async (_, args, { services }) => {
      const geoint = services?.geoint || new GeointService();
      return geoint.startGeoRoute(args);
    },
  },
};

module.exports = geoResolvers;
