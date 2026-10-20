import { ContactDetailPage } from "@/components/ContactDetailPage";
import { PageShell } from "@/components/PageShell";

export default async function ContactRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell>
      <ContactDetailPage id={id} />
    </PageShell>
  );
}
