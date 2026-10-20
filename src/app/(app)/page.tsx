import { HomeDashboard } from "@/components/HomeDashboard";
import { PageShell } from "@/components/PageShell";

export default function HomePage() {
  return (
    <PageShell className="flex h-full flex-col">
      <HomeDashboard />
    </PageShell>
  );
}
