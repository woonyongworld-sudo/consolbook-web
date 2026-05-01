import { SiteHeader } from "@/components/SiteHeader";
import ImporterWorkspace from "@/modules/dart-package-importer/ui/ImporterWorkspace";

export default function DartImporterPage() {
  return (
    <div className="flex flex-col">
      <SiteHeader current="dart" />
      <ImporterWorkspace />
    </div>
  );
}
