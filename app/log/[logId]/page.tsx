import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getLogById } from "@/lib/db/logs";
import { LogPersonSelect } from "@/components/log/log-person-select";
import { buildLogDays } from "@/lib/log/view-model";
import { LogDayView } from "@/components/log/log-day-view";

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
  const days = buildLogDays(log.entries);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Log details</h1>
        <LogPersonSelect value={person} />
      </header>

      <LogDayView days={days} />
    </div>
  );
}
