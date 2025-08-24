const seedrandom = require('seedrandom');

function generateGraph(spec) {
  const rng = seedrandom(spec.seed || 1);
  const nodes = [];
  const edges = [];
  const counts = spec.counts || {};
  const numPersons = counts.persons || 0;
  const numOrgs = counts.orgs || 0;
  const numAssets = counts.assets || 0;
  const numComms = counts.comms || 0;

  for (let i = 0; i < numPersons; i++) {
    nodes.push({ id: `person-${i}`, type: 'person' });
  }
  for (let i = 0; i < numOrgs; i++) {
    nodes.push({ id: `org-${i}`, type: 'org' });
  }
  for (let i = 0; i < numAssets; i++) {
    nodes.push({ id: `asset-${i}`, type: 'asset' });
  }
  for (let i = 0; i < numComms; i++) {
    nodes.push({ id: `comm-${i}`, type: 'comm' });
  }

  for (let i = 0; i < numPersons; i++) {
    if (numOrgs > 0) {
      const target = Math.floor(rng() * numOrgs);
      edges.push({ from: `person-${i}`, to: `org-${target}`, type: 'member_of' });
    }
  }
  for (let i = 0; i < numPersons; i++) {
    if (numAssets > 0) {
      const target = Math.floor(rng() * numAssets);
      edges.push({ from: `person-${i}`, to: `asset-${target}`, type: 'uses' });
    }
  }
  for (let i = 0; i < numComms; i++) {
    if (numPersons > 1) {
      const from = Math.floor(rng() * numPersons);
      let to = Math.floor(rng() * numPersons);
      if (to === from) {
        to = (to + 1) % numPersons;
      }
      edges.push({ from: `person-${from}`, to: `person-${to}`, type: 'communicates_with' });
    }
  }

  return { nodes, edges };
}

module.exports = { generateGraph };
