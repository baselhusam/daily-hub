import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-gutter flex min-h-[60vh] items-center py-[clamp(18px,2.6vw,32px)]">
      <div className="mx-auto w-full max-w-[1180px]">
        <PageHeader
          eyebrow="404"
          title="Page not found"
          description="That route does not exist. Head back to Today and pick up where you left off."
          actions={
            <Button asChild variant="default">
              <Link href="/">Back to Today</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
