"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-gutter py-[clamp(18px,2.6vw,32px)]">
      <div className="mx-auto w-full max-w-[1180px]">
        <PageHeader
          eyebrow="Something went wrong"
          title="Could not load this page"
          description="A server error interrupted the request. Try again, or return to Today if the problem persists."
          actions={
            <Button type="button" variant="default" onClick={() => reset()}>
              Try again
            </Button>
          }
        />
      </div>
    </div>
  );
}
