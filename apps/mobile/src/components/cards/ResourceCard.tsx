import type { ResourceItem } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";
import { FileText } from "lucide-react";

export function ResourceCard({ resource }: { resource: ResourceItem }) {
  return (
    <ElimaCard>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{resource.subject} · {resource.className}</p>
          <h3 className="font-title text-base font-semibold text-accent">{resource.title}</h3>
          {resource.description ? <p className="mt-1 text-sm text-gray-500">{resource.description}</p> : null}
          <p className="mt-2 text-xs text-gray-400">{resource.publishedAt}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
