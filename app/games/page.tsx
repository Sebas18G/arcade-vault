import { Library } from "@/components/library";
import { createClient } from "@/lib/supabase/server";
const SCORE_TABLE: Record<string, string> = {
  asteroids: "asteroids_scores",
  tetris: "tetris_scores",
  arkanoid: "arkanoid_scores",
  snake: "snake_scores",
};
async function fetchRealBests(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const entries = await Promise.all(
    Object.entries(SCORE_TABLE).map(async ([id, table]) => {
      const { data } = await supabase
        .from(table)
        .select("score")
        .order("score", { ascending: false })
        .limit(1);
      return [id, data?.[0]?.score] as const;
    }),
  );
  return Object.fromEntries(
    entries.filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}
export default async function GamesPage() {
  const realBests = await fetchRealBests();
  return <Library realBests={realBests} />;
}
