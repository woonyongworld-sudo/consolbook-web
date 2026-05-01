import { SiteHeader } from "@/components/SiteHeader";
import ValidationWorkspace from "@/modules/validation/ui/ValidationWorkspace";

export default function ValidationPage() {
  return (
    <div className="flex flex-col">
      <SiteHeader current="validation" />
      <ValidationWorkspace />
    </div>
  );
}
