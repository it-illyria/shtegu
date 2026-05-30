import { getTrails } from "@/lib/trails-repo";
import HomeClient from "./HomeClient";

// Cache SSR responses for 5 minutes; searchParams are still handled per-request.
export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [trails, { q }] = await Promise.all([
    getTrails(),
    searchParams.then((p) => ({ q: typeof p.q === "string" ? p.q : "" })),
  ]);

  return <HomeClient trails={trails} initialQuery={q} />;
}
