"use client";

import * as React from "react";

const SearchContext = React.createContext("");

export function SearchProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchQuery(): string {
  return React.useContext(SearchContext);
}
