type QueryKey = readonly unknown[];

const QUERY_INVALIDATED_EVENT = "primegrid:query-invalidated";

export const queryClient = {
  invalidateQueries({ queryKey }: { queryKey: QueryKey }) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(QUERY_INVALIDATED_EVENT, { detail: { queryKey } }));
  },
};

export function onQueryInvalidated(queryKey: QueryKey, callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: Event) => {
    const invalidatedKey = (event as CustomEvent<{ queryKey?: QueryKey }>).detail?.queryKey;
    if (invalidatedKey?.[0] === queryKey[0]) callback();
  };

  window.addEventListener(QUERY_INVALIDATED_EVENT, handler);
  return () => window.removeEventListener(QUERY_INVALIDATED_EVENT, handler);
}