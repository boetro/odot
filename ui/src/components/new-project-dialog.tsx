import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useEffect, useRef, useState, forwardRef } from "react";
import { Box, Check, Circle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjectsKeys } from "@/lib/queries/keys";
import type { Project } from "@/lib/types";

const COMMON_COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Cyan", hex: "#06b6d4" },
];

const SmallButton = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    onClick?: () => void;
  }
>(({ children, onClick, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      className="h-6 text-xs rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground"
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
});

SmallButton.displayName = "SmallButton";

export function NewProjectDialog({
  open,
  setOpen,
  projects,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  projects: Project[];
}) {
  const queryClient = useQueryClient();
  const projNameRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mutation = useMutation({
    mutationFn: (newProject: {
      name: string;
      description: string;
      color?: string;
      parent_project_id?: number;
    }) => {
      return fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newProject),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listProjectsKeys,
      });
      resetForm();
      setOpen(false);
    },
  });

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isParentProjectPickerOpen, setIsParentProjectPickerOpen] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setPendingProject({
      name: "",
      description: "",
      color: undefined,
      parentProject: undefined,
    });
    setError(null);
  }

  const handleTextareaResize = () => {
    if (textareaRef.current) {
      const maxHeight = window.innerHeight * 0.6;
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;

      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  };
  const [pendingProject, setPendingProject] = useState<{
    name: string;
    description: string;
    color: (typeof COMMON_COLORS)[0] | undefined;
    parentProject: Project | undefined;
  }>({
    name: "",
    description: "",
    color: undefined,
    parentProject: undefined,
  });

  function createProject() {
    if (!pendingProject.name) {
      setError("Name is required");
      return;
    }
    if (pendingProject.name.length < 3) {
      setError("Name must be at least 3 characters long");
      return;
    }
    if (pendingProject.name.length > 120) {
      setError("Name must be at most 120 characters long");
      return;
    }
    setError(null);

    let projColor = pendingProject.color?.hex;

    if (!pendingProject.color) {
      const randomColor =
        COMMON_COLORS[Math.floor(Math.random() * COMMON_COLORS.length)];
      projColor = randomColor.hex;
    }

    mutation.mutate({
      name: pendingProject.name,
      description: pendingProject.description,
      color: projColor,
      parent_project_id: pendingProject.parentProject?.id,
    });
  }

  useEffect(() => {
    if (projNameRef.current) {
      projNameRef.current.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "p" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Only trigger if not focused on an input element
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA")
        ) {
          return;
        }

        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        resetForm();
        setOpen(open);
      }}
    >
      <DialogContent
        className="sm:max-w-[60%] p-0 pt-4 overflow-y-auto"
        showCloseButton={false}
        aria-describedby="New Project Dialog"
      >
        <DialogHeader className="px-4">
          <DialogTitle>
            <input
              type="text"
              placeholder="Project Name"
              data-slot="input"
              ref={projNameRef}
              className="outline-none w-full"
              value={pendingProject.name}
              onChange={(e) =>
                setPendingProject({
                  ...pendingProject,
                  name: e.target.value,
                })
              }
            />
          </DialogTitle>
        </DialogHeader>
        <div className="flex space-y-4 flex-col px-4">
          <textarea
            ref={textareaRef}
            placeholder="Project Description (optional)"
            data-slot="textarea"
            className="outline-none text-sm w-full resize-none"
            rows={3}
            onInput={handleTextareaResize}
            style={{ minHeight: "3rem" }}
            value={pendingProject.description}
            onChange={(e) =>
              setPendingProject({
                ...pendingProject,
                description: e.target.value,
              })
            }
          />
          <div className="flex flex-row space-x-2">
            <Popover
              open={isColorPickerOpen}
              onOpenChange={setIsColorPickerOpen}
            >
              <PopoverTrigger asChild>
                <SmallButton>
                  <Circle
                    size={16}
                    fill={pendingProject?.color?.hex || "#808080"}
                    stroke={pendingProject?.color?.hex || "#808080"}
                  />
                  {pendingProject?.color?.name || "Color"}
                </SmallButton>
              </PopoverTrigger>
              <PopoverContent
                className="flex flex-col w-36 p-1 overflow-y-auto max-h-56"
                align="start"
              >
                {COMMON_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-sm"
                    onClick={() => {
                      setPendingProject({ ...pendingProject, color });
                      setIsColorPickerOpen(false);
                    }}
                  >
                    <Circle size={12} fill={color.hex} stroke={color.hex} />
                    {color.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Popover
              open={isParentProjectPickerOpen}
              onOpenChange={setIsParentProjectPickerOpen}
            >
              <PopoverTrigger asChild>
                <SmallButton>
                  <Box
                    style={{
                      color: pendingProject.parentProject?.color || "inherit",
                    }}
                  />
                  {pendingProject.parentProject?.name || "Parent Project"}
                </SmallButton>
              </PopoverTrigger>
              <PopoverContent
                className="flex flex-col w-36 p-1 overflow-y-auto max-h-56"
                align="start"
              >
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className="flex justify-between items-center gap-2 p-2 text-sm hover:bg-accent rounded-sm"
                    onClick={() => {
                      if (project.id === pendingProject.parentProject?.id) {
                        setPendingProject({
                          ...pendingProject,
                          parentProject: undefined,
                        });
                      } else {
                        setPendingProject({
                          ...pendingProject,
                          parentProject: project,
                        });
                      }
                      setIsParentProjectPickerOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Box size={12} style={{ color: project.color }} />
                      {project.name}
                    </span>
                    {project.id === pendingProject.parentProject?.id && (
                      <Check size={16} />
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter className="border-t py-2">
          <div className="flex justify-between px-4 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!pendingProject.name || mutation.isPending}
              onClick={createProject}
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
