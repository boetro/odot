import { Box, Check } from "lucide-react";
import { SmallButton } from "./small-button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Project } from "@/lib/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ProjectDropdown({
  selectedProject,
  setSelectedProject,
  projects,
  defaultText = "Project",
  variant = "small",
}: {
  selectedProject: Project | undefined | null;
  setSelectedProject: (project: Project | undefined) => void;
  projects: Project[];
  defaultText?: string;
  variant?: "small" | "large";
}) {
  const [open, setOpen] = useState(false);
  if (projects.length === 0) {
    if (variant === "small") {
      return (
        <SmallButton>
          <Box
            style={{
              color: selectedProject?.color || "inherit",
            }}
          />
          {selectedProject?.name || defaultText}
        </SmallButton>
      );
    } else {
      return (
        <button
          className={cn(
            "flex flex-row gap-4 items-center hover:bg-muted rounded-md p-1",
            selectedProject ? "" : "text-muted-foreground",
          )}
        >
          <Box
            className="size-4"
            style={{
              color: selectedProject?.color || "inherit",
            }}
          />
          <span>{selectedProject?.name || "Assign to project"}</span>
        </button>
      );
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        {variant === "small" ? (
          <SmallButton>
            <Box
              style={{
                color: selectedProject?.color || "inherit",
              }}
            />
            {selectedProject?.name || defaultText}
          </SmallButton>
        ) : (
          <button
            className={cn(
              "flex flex-row gap-4 items-center hover:bg-muted rounded-md p-1",
              selectedProject ? "" : "text-muted-foreground",
            )}
          >
            <Box
              className="size-4"
              style={{
                color: selectedProject?.color || "inherit",
              }}
            />
            <span>{selectedProject?.name || "Assign to project"}</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col w-36 p-1 overflow-y-auto max-h-60"
        align="start"
      >
        {projects.map((project) => (
          <button
            key={project.id}
            className="flex justify-between items-center gap-2 p-2 text-sm hover:bg-accent rounded-sm"
            onClick={() => {
              if (project.id === selectedProject?.id) {
                setSelectedProject(undefined);
              } else {
                setSelectedProject(project);
              }
              setOpen(false);
            }}
          >
            <span className="flex items-center gap-2">
              <Box size={12} style={{ color: project.color }} />
              {project.name}
            </span>
            {project.id === selectedProject?.id && <Check size={16} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
