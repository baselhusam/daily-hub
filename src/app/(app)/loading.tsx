export default function Loading() {
  return (
    <div
      className="page-gutter py-[clamp(18px,2.6vw,32px)]"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded bg-track" />
          <div className="h-10 w-64 max-w-full rounded-md bg-track" />
          <div className="h-4 w-80 max-w-full rounded bg-track" />
        </div>
        <div className="h-14 rounded-[12px] border border-border bg-card" />
        <div className="grid grid-cols-2 gap-3 dh:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[124px] rounded-[12px] border border-border bg-card"
            />
          ))}
        </div>
        <div className="h-52 rounded-[12px] border border-border bg-card" />
        <div className="h-40 rounded-[12px] border border-border bg-card" />
      </div>
    </div>
  );
}
