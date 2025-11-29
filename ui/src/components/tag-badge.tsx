import { Badge } from "./ui/badge";
import type { Tag } from "@/lib/types";
import { X } from "lucide-react";

export function TagBadge({
  tag,
  onRemove,
  size = "sm",
}: {
  tag: Tag;
  onRemove?: () => void;
  size?: "sm" | "md";
}) {
  return (
    <Badge
      variant="outline"
      className={size === "sm" ? "text-xs" : "text-sm"}
      style={{ borderColor: tag.color }}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-accent rounded-full p-0.5"
        >
          <X className="size-3" />
        </button>
      )}
    </Badge>
  );
}
