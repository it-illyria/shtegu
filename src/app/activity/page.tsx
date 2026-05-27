import { getTrails } from "@/lib/trails-repo";
import ActivityClient from "./ActivityClient";

export default async function ActivityPage() {
  const trails = await getTrails();
  return <ActivityClient trails={trails} />;
}
