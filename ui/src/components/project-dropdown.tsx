import { Box, Check } from "lucide-react";
import { SmallButton } from "./small-button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Project } from "@/lib/types";
import { useState } from "react";

export default function ProjectDropdown({
  selectedProject,
  setSelectedProject,
  projects,
  defaultText = "Project",
}: {
  selectedProject: Project | undefined | null;
  setSelectedProject: (project: Project | undefined) => void;
  projects: Project[];
  defaultText?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SmallButton>
          <Box
            style={{
              color: selectedProject?.color || "inherit",
            }}
          />
          {selectedProject?.name || defaultText}
        </SmallButton>
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
