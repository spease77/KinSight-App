import { Suspense } from "react";
import { EditContactPage } from "@/components/EditContactPage";

export default async function EditContactRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <p className="type-meta px-5 py-8 text-center" aria-live="polite">
          Loading contact…
        </p>
      }
    >
      <EditContactPage id={id} />
    </Suspense>
  );
}
