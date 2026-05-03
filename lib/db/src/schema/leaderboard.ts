import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull().default("PLAYER"),
  score: integer("score").notNull().default(0),
  wavesCleared: integer("waves_cleared").notNull().default(0),
  bossReached: integer("boss_reached").notNull().default(0),
  isFullCompletion: boolean("is_full_completion").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({
  id: true,
  createdAt: true,
});

export const selectLeaderboardSchema = createSelectSchema(leaderboardTable);

export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardRow = typeof leaderboardTable.$inferSelect;
