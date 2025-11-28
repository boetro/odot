import { Box, Check } from "lucide-react";
import { SmallButton } from "./small-button";
import { Button } from "./ui/button";
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
          <span className="truncate">{selectedProject?.name || defaultText}</span>
        </SmallButton>
      );
    } else {
      return (
        <Button
          variant="outline"
          size="default"
          className={cn(
            "justify-start lg:bg-transparent lg:border-none lg:shadow-none lg:hover:bg-accent",
            selectedProject ? "" : "text-muted-foreground",
          )}
        >
          <Box
            className="size-4"
            style={{
              color: selectedProject?.color || "inherit",
            }}
          />
          <span className="truncate">{selectedProject?.name || "Assign to project"}</span>
        </Button>
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
            <span className="truncate">{selectedProject?.name || defaultText}</span>
          </SmallButton>
        ) : (
          <Button
            variant="outline"
            size="default"
            className={cn(
              "justify-start lg:bg-transparent lg:border-none lg:shadow-none lg:hover:bg-accent",
              selectedProject ? "" : "text-muted-foreground",
            )}
          >
            <Box
              className="size-4"
              style={{
                color: selectedProject?.color || "inherit",
              }}
            />
            <span className="truncate">{selectedProject?.name || "Assign to project"}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col min-w-36 max-w-64 p-1 overflow-y-auto max-h-60"
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
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <Box size={12} style={{ color: project.color }} className="flex-shrink-0" />
              <span className="truncate">{project.name}</span>
            </span>
            {project.id === selectedProject?.id && <Check size={16} className="flex-shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
