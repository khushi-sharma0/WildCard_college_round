import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalUserRole = "admin" | "marketer" | "viewer";

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: null;
  role: LocalUserRole;
  created_at: string;
  password_salt: string;
  password_hash: string;
}

interface LocalUserStore {
  users: LocalUser[];
}

const STORE_PATH = path.join(process.cwd(), ".nexus-local-users.json");
const SEED_USERS = [
  { id: "a1100000-0000-4000-8000-000000000001", email: "admin@nexus.demo", full_name: "Nexus Admin", role: "admin" as const, password: "NexusAdmin!2026" },
  { id: "a1100000-0000-4000-8000-000000000002", email: "marketer@nexus.demo", full_name: "Nexus Marketer", role: "marketer" as const, password: "NexusMarketer!2026" },
  { id: "a1100000-0000-4000-8000-000000000003", email: "viewer@nexus.demo", full_name: "Nexus Viewer", role: "viewer" as const, password: "NexusViewer!2026" }
];

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function createSeedStore(): LocalUserStore {
  const createdAt = new Date().toISOString();
  return {
    users: SEED_USERS.map((seed) => {
      const salt = randomBytes(16).toString("hex");
      return {
        id: seed.id,
        email: seed.email,
        full_name: seed.full_name,
        avatar_url: null,
        role: seed.role,
        created_at: createdAt,
        password_salt: salt,
        password_hash: hashPassword(seed.password, salt)
      };
    })
  };
}

async function readStore(): Promise<LocalUserStore> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const store: unknown = JSON.parse(content);
    if (!store || typeof store !== "object" || !Array.isArray((store as LocalUserStore).users)) {
      throw new Error("Local user store has an invalid format.");
    }
    return store as LocalUserStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const seeded = createSeedStore();
    await writeFile(STORE_PATH, JSON.stringify(seeded, null, 2), { encoding: "utf8", mode: 0o600, flag: "wx" })
      .catch(async (writeError: NodeJS.ErrnoException) => {
        if (writeError.code !== "EEXIST") throw writeError;
      });
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        return JSON.parse(await readFile(STORE_PATH, "utf8")) as LocalUserStore;
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code !== "ENOENT") throw readError;
      }
    }
    return seeded;
  }
}

async function saveStore(store: LocalUserStore): Promise<void> {
  const tempPath = `${STORE_PATH}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(tempPath, STORE_PATH);
}

export async function getLocalUserById(id: string): Promise<LocalUser | null> {
  return (await readStore()).users.find((user) => user.id === id) || null;
}

export async function verifyLocalCredentials(email: string, password: string): Promise<LocalUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = (await readStore()).users;
  const user = users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
  if (!user) {
    hashPassword(password, "nexus-invalid-user-salt");
    return null;
  }
  const actual = Buffer.from(hashPassword(password, user.password_salt), "hex");
  const expected = Buffer.from(user.password_hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? user : null;
}

export async function listLocalUsers(): Promise<LocalUser[]> {
  return (await readStore()).users;
}

export async function updateLocalUserRole(id: string, role: LocalUserRole): Promise<{ user: LocalUser; previousRole: LocalUserRole }> {
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.id === id);
  if (!user) throw new Error("User profile not found.");
  const previousRole = user.role;
  if (previousRole === "admin" && role !== "admin" && store.users.filter((candidate) => candidate.role === "admin").length <= 1) {
    throw new Error("The last Admin cannot be demoted.");
  }
  user.role = role;
  await saveStore(store);
  return { user, previousRole };
}
