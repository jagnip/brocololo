/** Shared copy for add vs replace meal dialogs (single slot or bulk selection). */
export function getAddMealDialogCopy(slotSubtitle: string) {
  return {
    title: "Add meal",
    subtitle: slotSubtitle,
    saveLabel: "Save meal",
  } as const;
}

export function getReplaceMealDialogCopy(affectedSlotCount: number) {
  const slotLabel = affectedSlotCount === 1 ? "slot" : "slots";

  return {
    title: "Replace meal",
    subtitle: `This will update ${affectedSlotCount} selected ${slotLabel}.`,
    saveLabel: "Save changes",
  } as const;
}
