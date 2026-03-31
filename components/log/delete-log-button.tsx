"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteLogAction } from "@/actions/log-actions";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type DeleteLogButtonProps = {
  logId: string;
};

export function DeleteLogButton({ logId }: DeleteLogButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isDeleting}
      onClick={async () => {
        const confirmed = window.confirm("Delete this log permanently? This cannot be undone.");
        if (!confirmed) return;

        setIsDeleting(true);
        try {
          const result = await deleteLogAction(logId);
          if (result.type === "error") {
            toast.error(result.message);
            return;
          }
          router.push(ROUTES.log);
          router.refresh();
        } finally {
          setIsDeleting(false);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
      {isDeleting ? "Deleting..." : "Delete log"}
    </Button>
  );
}
