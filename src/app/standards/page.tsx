import { SiteHeader } from "@/components/SiteHeader";
import StandardsEditor from "@/modules/standards/ui/StandardsEditor";

export default function StandardsPage() {
  return (
    <div className="flex flex-col">
      <SiteHeader current="standards" />
      <StandardsEditor />
    </div>
  );
}
