import { StoragePageContainer } from "@/components/storage/storage-page-container";
import { TopbarConfigController } from "@/components/topbar-config";

export default function StoragePage() {
  return (
    <div className="page-container">
      <TopbarConfigController config={{ breadcrumbs: [{ label: "Rolling meals" }], actions: [] }} />
      <StoragePageContainer />
    </div>
  );
}
