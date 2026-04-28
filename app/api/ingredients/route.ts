import { NextRequest, NextResponse } from "next/server";
import { getIngredientsPage } from "@/lib/db/ingredients";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  // Keep the API contract narrow: the client can only request a search query and page chunk.
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

  const data = await getIngredientsPage({
    q,
    page: Number.isFinite(page) ? page : 1,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(data);
}
