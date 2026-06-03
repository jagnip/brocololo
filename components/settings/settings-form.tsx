"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createFamilyMemberAction,
  deleteFamilyMemberAction,
  getFamilyMemberRecipeImpactAction,
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

/** Display label for non-self members (delete dialog, aria-labels). */
function getFamilyMemberDisplayName(
  member: FamilyMemberRow,
  familyMembers: FamilyMemberRow[],
): string {
  const trimmed = member.name.trim();
  if (trimmed) {
    return trimmed;
  }
  const ordered = [...familyMembers].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex((row) => row.id === member.id);
  return `Family member ${index + 1}`;
}

export function SettingsForm({ initialMembers }: SettingsFormProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [draftNames, setDraftNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialMembers.map((member) => [member.id, member.name])),
  );
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMemberRow | null>(null);
  const [deleteHasRecipeImpact, setDeleteHasRecipeImpact] = useState(false);
  const [isAdding, startAddTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const selfMember = useMemo(
    () => members.find((member) => member.isSelf),
    [members],
  );

  const familyMembers = useMemo(
    () =>
      members
        .filter((member) => !member.isSelf)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [members],
  );

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
      actions: [],
    }),
    [],
  );

  const refreshFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  const saveName = useCallback(
    async (member: FamilyMemberRow) => {
      const trimmed = (draftNames[member.id] ?? "").trim();
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
      const result = await createFamilyMemberAction({ name: "" });
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

  const handleRequestDelete = async (member: FamilyMemberRow) => {
    const result = await getFamilyMemberRecipeImpactAction({ id: member.id });
    if (result.type === "error") {
      toast.error(result.message);
      return;
    }
    setDeleteHasRecipeImpact(result.hasRecipeImpact);
    setDeleteTarget(member);
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

  const renderNameInput = (
    member: FamilyMemberRow,
    label: string,
    placeholder: string,
  ) => (
    <div className="w-full md:w-1/2 lg:w-1/3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`family-member-${member.id}`}>{label}</Label>
        <Input
          id={`family-member-${member.id}`}
          value={draftNames[member.id] ?? ""}
          placeholder={placeholder}
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
  );

  return (
    <>
      <TopbarConfigController config={topbarConfig} />
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => event.preventDefault()}
      >
        {/* Account holder — separate from household members */}
        {selfMember ? (
          <section>
            <div className="mb-3">
              <Subheader>Your profile</Subheader>
            </div>
            <div className="section-container">
              <div className="flex flex-col gap-3">
                {renderNameInput(
                  selfMember,
                  "Your name",
                  "Enter your name",
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3">
            <Subheader>Family members</Subheader>
          </div>
          <div className="section-container">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Add family members to adjust recipes and view nutrition by
                person.
              </p>

              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-end gap-item"
                >
                  {renderNameInput(
                    member,
                    "Family member's name",
                    "Enter name",
                  )}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove ${getFamilyMemberDisplayName(member, familyMembers)}`}
                      onClick={() => void handleRequestDelete(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                    "Add family member"
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
            setDeleteHasRecipeImpact(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove family member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? deleteHasRecipeImpact
                  ? `${getFamilyMemberDisplayName(deleteTarget, familyMembers)} will be removed from your household list, recipes, serving multipliers, and ingredient customisations.`
                  : `${getFamilyMemberDisplayName(deleteTarget, familyMembers)} will be removed from your household list.`
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
