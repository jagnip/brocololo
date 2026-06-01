import { ShareGroceriesPageContainer } from "@/components/groceries/share/share-groceries-page-container";

export default async function ShareGroceriesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShareGroceriesPageContainer token={token} />;
}
