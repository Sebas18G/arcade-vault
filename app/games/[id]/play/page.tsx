import { notFound } from "next/navigation";
import { GAMES } from "@/app/data/games";
import { GamePlayer } from "@/components/game-player";
import { requirePlayer } from "@/lib/auth-guard";
export default async function GamePlayerPage({
  params,
}: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  // Defensa en profundidad, además del matcher de proxy.ts.
  await requirePlayer(`/games/${id}/play`);
  return <GamePlayer game={game} />;
}
