import { NextRequest, NextResponse } from "next/server";
import { getIngredientsPage } from "@/lib/db/ingredients";
import { requireUser } from "@/lib/auth/session";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const { id: userId } = await requireUser();
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const categorySlug =
    request.nextUrl.searchParams.get("category") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

  const data = await getIngredientsPage({
    userId,
    q,
    categorySlug,
    page: Number.isFinite(page) ? page : 1,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(data);
}
