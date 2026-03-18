import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getLogById } from "@/lib/db/logs";
import { LogPersonSelect } from "@/components/log/log-person-select";

type LogDetailPageProps = {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ person?: string }>;
};

function parsePerson(input?: string): "PRIMARY" | "SECONDARY" {
  if (input === LogPerson.SECONDARY) return LogPerson.SECONDARY;
  return LogPerson.PRIMARY;
}

export default async function LogDetailPage({
  params,
  searchParams,
}: LogDetailPageProps) {
  const { logId } = await params;
  const { person: rawPerson } = await searchParams;
  const person = parsePerson(rawPerson);

  const log = await getLogById(logId, person);
  if (!log) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Log details</h1>
        <LogPersonSelect value={person} />
      </header>

      <pre className="rounded-lg border p-4 text-xs overflow-auto bg-muted/20">
        {JSON.stringify(log, null, 2)}
      </pre>
    </div>
  );
}
