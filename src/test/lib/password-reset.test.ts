import crypto from "crypto";

type Row = { identifier: string; token: string; expires: Date };
const rows: Row[] = [];

vi.mock("@/lib/db", () => {
  const verificationToken = {
    deleteMany: vi.fn(async ({ where }: { where: { identifier: string } }) => {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].identifier === where.identifier) rows.splice(i, 1);
    }),
    create: vi.fn(async ({ data }: { data: Row }) => {
      rows.push(data);
      return data;
    }),
    findUnique: vi.fn(async ({ where }: { where: { token: string } }) => rows.find((r) => r.token === where.token) ?? null),
    delete: vi.fn(async ({ where }: { where: { token: string } }) => {
      const i = rows.findIndex((r) => r.token === where.token);
      if (i >= 0) rows.splice(i, 1);
    }),
  };
  return { db: { verificationToken, $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops) } };
});

import { consumeResetToken, createResetToken } from "@/lib/password-reset";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

describe("password reset tokens", () => {
  beforeEach(() => {
    rows.length = 0;
  });

  it("stores only a hash of the token", async () => {
    const raw = await createResetToken("user_1");
    expect(rows).toHaveLength(1);
    expect(rows[0].token).toBe(sha256(raw));
    expect(rows[0].token).not.toContain(raw);
  });

  it("returns the user ID once, then rejects reuse", async () => {
    const raw = await createResetToken("user_1");
    expect(await consumeResetToken(raw)).toBe("user_1");
    expect(await consumeResetToken(raw)).toBeNull();
  });

  it("replaces an earlier token for the same user", async () => {
    const first = await createResetToken("user_1");
    const second = await createResetToken("user_1");
    expect(rows).toHaveLength(1);
    expect(await consumeResetToken(first)).toBeNull();
    expect(await consumeResetToken(second)).toBe("user_1");
  });

  it("rejects and cleans up an expired token", async () => {
    const raw = await createResetToken("user_1");
    rows[0].expires = new Date(Date.now() - 1000);
    expect(await consumeResetToken(raw)).toBeNull();
    expect(rows).toHaveLength(0);
  });

  it("ignores verification tokens that aren't reset tokens", async () => {
    rows.push({ identifier: "someone@example.com", token: sha256("magic"), expires: new Date(Date.now() + 60_000) });
    expect(await consumeResetToken("magic")).toBeNull();
  });

  it("rejects empty and oversized tokens without a lookup", async () => {
    expect(await consumeResetToken("")).toBeNull();
    expect(await consumeResetToken("x".repeat(500))).toBeNull();
  });
});
