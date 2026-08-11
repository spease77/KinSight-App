import { AppShell } from "@/components/AppShell";
import { ContactsProvider } from "@/components/ContactsProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContactsProvider>
      <AppShell>{children}</AppShell>
    </ContactsProvider>
  );
}
