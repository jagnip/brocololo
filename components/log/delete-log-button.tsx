"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteLogAction } from "@/actions/log-actions";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteLogButtonProps = {
  logId: string;
};

export function DeleteLogButton({ logId }: DeleteLogButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isDeleting}
        onClick={() => {
          setIsDialogOpen(true);
        }}
      >
        {/* Match day-delete button UX: spinner icon only while deleting. */}
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this log permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setIsDeleting(true);
              void (async () => {
                try {
                  const result = await deleteLogAction(logId);
                  if (result.type === "error") {
                    toast.error(result.message);
                    return;
                  }
                  if (result.nextLogId) {
                    router.push(ROUTES.logView(result.nextLogId));
                  } else {
                    router.push(ROUTES.logCurrent);
                  }
                  router.refresh();
                } finally {
                  setIsDeleting(false);
                  setIsDialogOpen(false);
                }
              })();
            }}
          >
            Delete log
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
