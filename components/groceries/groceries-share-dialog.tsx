"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createShoppingListShareAction,
  getActiveShoppingListShareAction,
  revokeShoppingListShareAction,
} from "@/actions/shopping-list-share-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GroceriesShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
};

export function GroceriesShareDialog({
  open,
  onOpenChange,
  planId,
}: GroceriesShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isMutating, startMutateTransition] = useTransition();

  const loadActiveShare = useCallback(() => {
    startLoadTransition(async () => {
      const result = await getActiveShoppingListShareAction(planId);
      if (result.type === "success") {
        setShareUrl(result.url);
        setExpiresAt(result.expiresAt);
        return;
      }
      if (result.type === "none") {
        setShareUrl(null);
        setExpiresAt(null);
        return;
      }
      toast.error(result.message);
    });
  }, [planId]);

  useEffect(() => {
    if (open) {
      loadActiveShare();
    }
  }, [open, loadActiveShare]);

  const onCreateLink = () => {
    startMutateTransition(async () => {
      const result = await createShoppingListShareAction(planId);
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      setShareUrl(result.url);
      setExpiresAt(result.expiresAt);
      toast.success("Share link created.");
    });
  };

  const onCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard.");
      onOpenChange(false);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const onRevokeLink = () => {
    startMutateTransition(async () => {
      const result = await revokeShoppingListShareAction(planId);
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      setShareUrl(null);
      setExpiresAt(null);
      toast.success("Share link revoked.");
    });
  };

  const expiryLabel =
    expiresAt != null
      ? format(new Date(expiresAt), "MMM d, yyyy 'at' h:mm a")
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share grocery list</DialogTitle>
          <DialogDescription>
            {shareUrl
              ? "Anyone with this link can view the list."
              : "Create a link to send to someone shopping with you."}
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-2">
            <Label htmlFor="grocery-share-url">Share link</Label>
            <Input
              id="grocery-share-url"
              readOnly
              value={shareUrl}
              className="font-mono text-xs"
            />
            {expiryLabel ? (
              <p className="text-sm text-muted-foreground">
                Expires {expiryLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter
          className={
            shareUrl
              ? "flex-col gap-2 sm:flex-row sm:justify-between"
              : "justify-end"
          }
        >
          {shareUrl ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void onRevokeLink()}
                disabled={isMutating || isLoading}
              >
                Revoke link
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCreateLink}
                  disabled={isMutating || isLoading}
                >
                  Create new link
                </Button>
                <Button
                  type="button"
                  onClick={() => void onCopyLink()}
                  disabled={isMutating || isLoading}
                >
                  Copy link
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              onClick={onCreateLink}
              disabled={isMutating || isLoading}
            >
              Create link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
