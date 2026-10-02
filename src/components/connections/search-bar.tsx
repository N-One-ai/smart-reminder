"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { searchUsers } from "@/lib/connections/actions";
import { NETWORK_ERROR_MESSAGE } from "@/lib/network-error";
import { useDictionary } from "@/lib/i18n/locale-provider";
import type { UserSearchResult } from "@/types/connection";
import { SearchResultRow } from "./search-result-row";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export function SearchBar({ currentUserId, onChanged }: { currentUserId: string; onChanged: () => void }) {
  const dict = useDictionary();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an older, slower request landing after a newer one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Resetting the search UI in direct response to the query itself
      // shrinking below the search threshold.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchUsers(trimmed);
        if (requestIdRef.current !== thisRequestId) return; // stale
        if (!result.ok) {
          toast.error(result.error.message);
          setResults([]);
          return;
        }
        setResults(result.data);
      } catch {
        if (requestIdRef.current !== thisRequestId) return;
        toast.error(NETWORK_ERROR_MESSAGE);
        setResults([]);
      } finally {
        if (requestIdRef.current === thisRequestId) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmedLength = query.trim().length;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id="connections-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.connections.searchPlaceholder}
          className="h-12 pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {trimmedLength > 0 && trimmedLength < MIN_QUERY_LENGTH && (
        <p className="text-xs text-muted-foreground px-1">{dict.connections.searchMinChars}</p>
      )}

      {results !== null && trimmedLength >= MIN_QUERY_LENGTH && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{dict.connections.noSearchResults}</p>
          ) : (
            results.map((result) => (
              <SearchResultRow
                key={result.id}
                result={result}
                isSelf={result.id === currentUserId}
                onChanged={onChanged}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
