import { revalidatePath } from "next/cache";

const PAGE_PATHS = ["/", "/projects", "/analytics", "/daily"] as const;

/** Refresh shell data (notifications, sidebar) and every app page. */
export function revalidateApp() {
  revalidatePath("/", "layout");
  for (const path of PAGE_PATHS) {
    revalidatePath(path);
  }
  // The project detail route is dynamic — passing the segment pattern clears
  // every instance of it, so a task toggled from one project's page doesn't
  // leave a stale copy of another's behind in the client router cache.
  revalidatePath("/projects/[id]", "page");
}
