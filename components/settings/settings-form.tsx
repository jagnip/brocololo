"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createFamilyMemberAction,
  deleteFamilyMemberAction,
  updateFamilyMemberNameAction,
} from "@/actions/family-member-actions";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { TopbarConfigController } from "@/components/topbar-config";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type SettingsFormProps = {
  initialMembers: FamilyMemberRow[];
};

export function SettingsForm({ initialMembers }: SettingsFormProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [draftNames, setDraftNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialMembers.map((member) => [member.id, member.name])),
  );
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMemberRow | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    setMembers(initialMembers);
    setDraftNames(
      Object.fromEntries(
        initialMembers.map((member) => [member.id, member.name]),
      ),
    );
  }, [initialMembers]);

  const topbarConfig = useMemo(
    () => ({
      breadcrumbs: [{ label: "Settings" }],
    }),
    [],
  );

  const refreshFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  const saveName = useCallback(
    async (member: FamilyMemberRow) => {
      const trimmed = (draftNames[member.id] ?? "").trim();
      if (!trimmed) {
        setDraftNames((prev) => ({ ...prev, [member.id]: member.name }));
        toast.error("Name cannot be empty.");
        return;
      }
      if (trimmed === member.name) {
        return;
      }

      setPendingMemberId(member.id);
      const result = await updateFamilyMemberNameAction({
        id: member.id,
        name: trimmed,
      });
      setPendingMemberId(null);

      if (result.type === "error") {
        setDraftNames((prev) => ({ ...prev, [member.id]: member.name }));
        toast.error(result.message);
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, name: result.member.name } : row,
        ),
      );
      refreshFromServer();
    },
    [draftNames, refreshFromServer],
  );

  const handleAddMember = () => {
    startAddTransition(async () => {
      const result = await createFamilyMemberAction({ name: "Family member" });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      setMembers((prev) => [...prev, result.member]);
      setDraftNames((prev) => ({
        ...prev,
        [result.member.id]: result.member.name,
      }));
      refreshFromServer();
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteFamilyMemberAction({ id: deleteTarget.id });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      setMembers((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
      refreshFromServer();
    });
  };

  return (
    <>
      <TopbarConfigController config={topbarConfig} />
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <section>
          <div className="mb-3">
            <Subheader>Family members</Subheader>
          </div>
          <div className="section-container">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Names for meal log and planner portions. These are not separate
                accounts.
              </p>

              {members.map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-1 gap-item lg:grid-cols-3 lg:items-end"
                >
                  <div
                    className={
                      member.isSelf ? "lg:col-span-3" : "lg:col-span-2"
                    }
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`family-member-${member.id}`}>
                        {member.isSelf ? "You" : "Name"}
                      </Label>
                      <Input
                        id={`family-member-${member.id}`}
                        value={draftNames[member.id] ?? ""}
                        disabled={pendingMemberId === member.id}
                        onChange={(event) =>
                          setDraftNames((prev) => ({
                            ...prev,
                            [member.id]: event.target.value,
                          }))
                        }
                        onBlur={() => void saveName(member)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  </div>
                  {!member.isSelf ? (
                    <div className="flex items-end lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => setDeleteTarget(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="hidden lg:block" aria-hidden />
                  )}
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAdding}
                  onClick={handleAddMember}
                >
                  {isAdding ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        data-icon="inline-start"
                      />
                      Adding…
                    </>
                  ) : (
                    "+ Add family member"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </form>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove family member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed from your household list.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isDeleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
