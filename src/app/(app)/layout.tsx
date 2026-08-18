import { ContactsProvider } from "@/components/ContactsProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContactsProvider>{children}</ContactsProvider>;
}
