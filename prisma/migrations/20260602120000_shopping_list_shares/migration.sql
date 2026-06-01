-- CreateTable
CREATE TABLE "shopping_list_shares" (
    "id" TEXT NOT NULL,
    "shopping_list_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "shopping_list_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_shares_token_key" ON "shopping_list_shares"("token");

-- CreateIndex
CREATE INDEX "shopping_list_shares_shopping_list_id_idx" ON "shopping_list_shares"("shopping_list_id");

-- CreateIndex
CREATE INDEX "shopping_list_shares_expires_at_idx" ON "shopping_list_shares"("expires_at");

-- AddForeignKey
ALTER TABLE "shopping_list_shares" ADD CONSTRAINT "shopping_list_shares_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_shares" ADD CONSTRAINT "shopping_list_shares_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
