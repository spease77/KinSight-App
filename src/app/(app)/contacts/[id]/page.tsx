import { ContactDetailPage } from "@/components/ContactDetailPage";

export default async function ContactRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetailPage id={id} />;
}
