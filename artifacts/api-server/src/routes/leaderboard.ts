import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, leaderboardTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_TOKEN = process.env["ADMIN_TOKEN"] ?? "Orcas@0112";

function requireAdmin(req: Request, res: Response): boolean {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const submitBodySchema = z.object({
  playerName: z.string().min(1).max(40).default("PLAYER"),
  score: z.number().int(),
  wavesCleared: z.number().int().min(0),
  bossReached: z.number().int().min(0),
  isFullCompletion: z.boolean(),
});

// GET /api/leaderboard — top 20 by score
router.get("/leaderboard", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(leaderboardTable)
      .orderBy(desc(leaderboardTable.score))
      .limit(20);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/leaderboard — submit score
router.post("/leaderboard", async (req, res) => {
  const parsed = submitBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { playerName, score, wavesCleared, bossReached, isFullCompletion } = parsed.data;
  try {
    const [row] = await db
      .insert(leaderboardTable)
      .values({ playerName, score, wavesCleared, bossReached, isFullCompletion })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to insert leaderboard entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/leaderboard/completions — last 10 full completions (admin)
router.get("/leaderboard/completions", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(leaderboardTable)
      .where(eq(leaderboardTable.isFullCompletion, true))
      .orderBy(desc(leaderboardTable.createdAt))
      .limit(10);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch completions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/leaderboard — wipe all (admin)
router.delete("/leaderboard", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.delete(leaderboardTable);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to clear leaderboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/leaderboard/:id — delete one entry (admin)
router.delete("/leaderboard/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(leaderboardTable).where(eq(leaderboardTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete leaderboard entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
