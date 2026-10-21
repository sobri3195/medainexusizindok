import Dexie, { type EntityTable } from "dexie";
import { seed, stateSchema, type State, type Store } from "./domain";
// Deliberately separate from the legacy claim database. No production records accepted.
class SyntheticDatabase extends Dexie {
  snapshots!: EntityTable<{ key: string; state: State }, "key">;
  constructor() {
    super("jelas-synthetic-dispensing-v1");
    this.version(1).stores({ snapshots: "key" });
  }
}
const db = new SyntheticDatabase();
export const syntheticStore: Store = {
  async read() {
    return db.transaction("rw", db.snapshots, async () => {
      let row = await db.snapshots.get("synthetic-v1");
      if (!row) {
        row = { key: "synthetic-v1", state: seed() };
        await db.snapshots.add(row);
      }
      return stateSchema.parse(row.state);
    });
  },
  async mutate<T>(fn: (state: State) => T): Promise<T> {
    return db.transaction("rw", db.snapshots, async () => {
      const row = await db.snapshots.get("synthetic-v1");
      const state = stateSchema.parse(row?.state ?? seed());
      const result = fn(state);
      await db.snapshots.put({
        key: "synthetic-v1",
        state: stateSchema.parse(state),
      });
      return result;
    });
  },
};
