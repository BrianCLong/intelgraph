import { Entity, Relationship } from '../schema';
import { v4 as uuid } from 'uuid';

class Store {
  entities = new Map<string, Entity>();
  relationships = new Map<string, Relationship>();

  upsertEntity(data: Entity) {
    const id = data.id || uuid();
    const existing = this.entities.get(id);
    const entity = { ...existing, ...data, id } as Entity;
    this.entities.set(id, entity);
    return entity;
  }

  upsertRelationship(data: Relationship) {
    const id = data.id || uuid();
    const existing = this.relationships.get(id);
    const rel = { ...existing, ...data, id } as Relationship;
    this.relationships.set(id, rel);
    return rel;
  }

  getEntity(id: string) {
    return this.entities.get(id);
  }

  getEntityAt(id: string, time: string) {
    const e = this.entities.get(id);
    if (!e) return undefined;
    const t = new Date(time).toISOString();
    if (e.validFrom && e.validFrom > t) return undefined;
    if (e.validTo && e.validTo <= t) return undefined;
    return e;
  }
}

export const store = new Store();
