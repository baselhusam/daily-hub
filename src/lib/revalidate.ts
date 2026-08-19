import { revalidatePath } from "next/cache";

const PAGE_PATHS = ["/", "/projects", "/analytics", "/daily"] as const;

/** Refresh shell data (notifications, sidebar) and every app page. */
export function revalidateApp() {
  revalidatePath("/", "layout");
  for (const path of PAGE_PATHS) {
    revalidatePath(path);
  }
}
