import { LogDetailPageContainer } from "@/components/log/log-detail-page-container";

export default async function LogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ person?: string; day?: string }>;
}) {
  const { logId } = await params;
  const { person, day } = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <LogDetailPageContainer logId={logId} person={person} day={day} />
    </div>
  );
}
