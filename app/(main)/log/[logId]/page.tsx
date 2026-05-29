import { notFound, redirect } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { ROUTES } from "@/lib/constants";
import { getLogById } from "@/lib/db/logs";

export default async function LogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ person?: string; day?: string }>;
}) {
  const { logId } = await params;
  const { person } = await searchParams;
  const log = await getLogById(logId, LogPerson.PRIMARY);
  if (!log) {
    notFound();
  }

  const paramsForRedirect = new URLSearchParams();
  paramsForRedirect.set("tab", "log");
  if (person) {
    paramsForRedirect.set("person", person);
  }
  redirect(`${ROUTES.planView(log.plan.id)}?${paramsForRedirect.toString()}`);
}
