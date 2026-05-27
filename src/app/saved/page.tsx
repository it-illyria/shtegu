import { getTrails } from "@/lib/trails-repo";
import SavedClient from "./SavedClient";

export default async function SavedPage() {
  const trails = await getTrails();
  return <SavedClient trails={trails} />;
}
