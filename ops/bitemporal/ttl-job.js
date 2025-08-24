// Simple TTL job removing expired bitemporal records
async function purgeExpired(session) {
  await session.run(
    'MATCH (n:Bitemporal) WHERE n.tx_to < datetime() DETACH DELETE n'
  );
}

module.exports = { purgeExpired };
