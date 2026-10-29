/**
 * Exécute une fonction dans une transaction SQL.
 *
 * Toutes les requêtes faites avec `tx` sont validées ensemble (COMMIT)
 * ou annulées ensemble (ROLLBACK) si une erreur est levée : on ne peut
 * pas débiter un passager sans lui réserver sa place, par exemple.
 * C'est la propriété « Atomicité » des transactions ACID.
 */
import type { Database, Transaction } from "../db/postgres";

export type TransactionRunner = <T>(work: (tx: Transaction) => Promise<T>) => Promise<T>;

export function createTransactionRunner(db: Database): TransactionRunner {
  return (work) => db.transaction(work);
}
