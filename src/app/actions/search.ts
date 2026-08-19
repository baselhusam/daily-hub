"use server";

import { getSearchIndex, type SearchIndex } from "@/lib/search";

export async function loadSearchIndex(): Promise<SearchIndex> {
  return getSearchIndex();
}
