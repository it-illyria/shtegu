import { getTrails } from "@/lib/trails-repo";
import HomeClient from "./HomeClient";

// Cache SSR responses for 5 minutes. `?q=` is handled client-side so the
// data cache key for `/` stays query-agnostic.
export const revalidate = 300;

export default async function Home() {
  const trails = await getTrails();
  return <HomeClient trails={trails} />;
}
