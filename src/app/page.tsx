import { getTrails } from "@/lib/trails-repo";
import HomeClient from "./HomeClient";

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
