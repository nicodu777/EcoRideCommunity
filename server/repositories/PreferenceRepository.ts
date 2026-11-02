/**
 * ====================================================================
 * Composants d'accès aux données NoSQL (MongoDB)
 * ====================================================================
 *
 * Collection `driver_preferences` : un document par chauffeur
 *   { userId: 12, smoker: false, animals: true,
 *     custom: ["Pas de musique forte", "Pause toutes les 2h"], updatedAt: ... }
 *
 * Collection `admin_logs` : un document par action de l'administrateur
 *   { action: "suspend_user", adminId: 1, targetId: 12, details: {...}, createdAt: ... }
 *
 * Chaque repository est décrit par une interface : le service dépend de
 * l'interface, pas de MongoDB. Dans les tests, on injecte une version en
 * mémoire ; en production, la version MongoDB.
 * ====================================================================
 */
import type { Db, Collection } from "mongodb";
import type { DriverPreferences } from "@shared/schema";

export interface PreferenceRepository {
  findByUser(userId: number): Promise<DriverPreferences | null>;
  save(userId: number, preferences: DriverPreferences): Promise<DriverPreferences>;
}

export interface AdminLogEntry {
  action: string;
  adminId: number;
  targetId: number;
  details?: Record<string, unknown>;
  createdAt: Date;
}

export interface AdminLogRepository {
  add(entry: Omit<AdminLogEntry, "createdAt">): Promise<void>;
  latest(limit?: number): Promise<AdminLogEntry[]>;
}

type PreferenceDocument = DriverPreferences & { userId: number; updatedAt: Date };

export class MongoPreferenceRepository implements PreferenceRepository {
  private readonly collection: Collection<PreferenceDocument>;

  constructor(db: Db) {
    this.collection = db.collection<PreferenceDocument>("driver_preferences");
  }

  async findByUser(userId: number): Promise<DriverPreferences | null> {
    // projection : on ne renvoie que les champs utiles (pas l'_id technique)
    const doc = await this.collection.findOne({ userId }, { projection: { _id: 0, smoker: 1, animals: 1, custom: 1 } });
    return doc ? { smoker: doc.smoker, animals: doc.animals, custom: doc.custom ?? [] } : null;
  }

  async save(userId: number, preferences: DriverPreferences): Promise<DriverPreferences> {
    // upsert : crée le document s'il n'existe pas, sinon le met à jour
    await this.collection.updateOne(
      { userId },
      { $set: { ...preferences, updatedAt: new Date() } },
      { upsert: true },
    );
    return preferences;
  }
}

export class MongoAdminLogRepository implements AdminLogRepository {
  private readonly collection: Collection<AdminLogEntry>;

  constructor(db: Db) {
    this.collection = db.collection<AdminLogEntry>("admin_logs");
  }

  async add(entry: Omit<AdminLogEntry, "createdAt">): Promise<void> {
    await this.collection.insertOne({ ...entry, createdAt: new Date() });
  }

  async latest(limit = 50): Promise<AdminLogEntry[]> {
    return this.collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

/** Implémentations en mémoire : utilisées si MongoDB n'est pas configuré et dans les tests. */
export class InMemoryPreferenceRepository implements PreferenceRepository {
  private readonly store = new Map<number, DriverPreferences>();
  async findByUser(userId: number) { return this.store.get(userId) ?? null; }
  async save(userId: number, preferences: DriverPreferences) { this.store.set(userId, preferences); return preferences; }
}

export class InMemoryAdminLogRepository implements AdminLogRepository {
  private readonly entries: AdminLogEntry[] = [];
  async add(entry: Omit<AdminLogEntry, "createdAt">) { this.entries.unshift({ ...entry, createdAt: new Date() }); }
  async latest(limit = 50) { return this.entries.slice(0, limit); }
}
