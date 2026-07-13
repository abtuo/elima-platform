import type { MessagePreview } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";

export function MessageCard({ message }: { message: MessagePreview }) {
  return (
    <ElimaCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-title truncate text-base font-semibold ${message.read ? "text-gray-600" : "text-accent"}`}>
              {message.subject}
            </h3>
            {!message.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">{message.preview}</p>
          <p className="mt-2 text-xs text-gray-400">{message.sender} · {message.date}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
