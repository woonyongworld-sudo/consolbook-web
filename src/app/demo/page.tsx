import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import DemoWorkspace from "./DemoWorkspace";

export default function DemoPage() {
  return (
    <div className="flex flex-col">
      <SiteHeader current="demo" />
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate-500">
            불러오는 중…
          </div>
        }
      >
        <DemoWorkspace />
      </Suspense>
    </div>
  );
}
