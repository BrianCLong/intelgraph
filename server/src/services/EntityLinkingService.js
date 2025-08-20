import { getNeo4jDriver } from "../config/database.js";
import logger from "../utils/logger.js";
import * as GNNModule from "./GNNService.js";

/**
 * Entity Linking Service
 * Uses Neo4j embeddings and GNN link prediction to suggest likely links
 * when a user explores an entity.
 */
class EntityLinkingService {
  /**
   * Suggest links for a given entity using embedding similarity and GNN.
   * @param {string} entityId - The source entity id.
   * @param {object} options - Additional options.
   * @param {number} [options.limit=5] - Number of candidate suggestions.
   * @param {string} [options.investigationId] - Investigation context id.
   * @param {string} [options.token] - Auth token for ML service.
   */
  static async suggestLinksForEntity(entityId, options = {}) {
    const { limit = 5, investigationId = "realtime", token } = options;
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      // Fetch source embedding and existing edges
      const sourceResult = await session.run(
        `MATCH (e:Entity {id: $entityId})
         WHERE exists(e.embedding)
         OPTIONAL MATCH (e)-[r]-(n:Entity)
         RETURN e.embedding AS embedding, collect({source: e.id, target: n.id}) AS edges`,
        { entityId },
      );
      if (sourceResult.records.length === 0) {
        logger.warn("No embedding found for entity", { entityId });
        return { success: false, message: "Entity embedding not found" };
      }
      const sourceEmbedding = sourceResult.records[0].get("embedding");
      const existingEdges = sourceResult.records[0].get("edges");

      // Fetch candidate nodes by embedding similarity
      const candidateResult = await session.run(
        `MATCH (e:Entity {id: $entityId})
         WHERE exists(e.embedding)
         MATCH (candidate:Entity)
         WHERE candidate.id <> e.id AND exists(candidate.embedding)
         WITH e, candidate, gds.similarity.cosine(e.embedding, candidate.embedding) AS score
         ORDER BY score DESC LIMIT $limit
         RETURN candidate.id AS id, candidate.embedding AS embedding`,
        { entityId, limit: Number(limit) },
      );
      const candidates = candidateResult.records.map((rec) => ({
        id: rec.get("id"),
        embedding: rec.get("embedding"),
      }));

      if (candidates.length === 0) {
        return { success: false, message: "No candidate entities found" };
      }

      const nodeFeatures = { [entityId]: sourceEmbedding };
      candidates.forEach((c) => {
        nodeFeatures[c.id] = c.embedding;
      });

      const candidateEdges = candidates.map((c) => [entityId, c.id]);
      const graphData = { edges: existingEdges || [] };

      const result = await GNNModule.default.predictLinks({
        investigationId,
        graphData,
        nodeFeatures,
        candidateEdges,
        modelName: "default_link_predictor",
        taskMode: "predict",
        options: { token, focusEntityId: entityId },
      });

      return {
        ...result,
        candidates: candidates.map((c) => c.id),
      };
    } catch (error) {
      logger.error("Entity link suggestion failed", {
        entityId,
        error: error.message,
      });
      return { success: false, error: error.message };
    } finally {
      await session.close();
    }
  }
}

export default EntityLinkingService;
