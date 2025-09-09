import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { Switch } from "./ui/switch";
import type { Project } from "@/lib/types";
import ProjectDropdown from "./project-dropdown";
import DateDropdown from "./date-dropdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjectTodos, listUserTodos } from "@/lib/queries/keys";
import { imageQueries } from "@/lib/queries/images";
import { ProseMirrorEditor } from "./prosemirror-editor";
import { ScanEye, Loader2 } from "lucide-react";
import { SmallButton } from "./small-button";
import { apiRequest } from "@/lib/api";

function combineDate(date: Date | undefined, timeStr: string | undefined) {
  if (!date) return undefined;

  if (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
}

export function NewTodoDialog({
  open,
  setOpen,
  projects,
  initialProject,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  projects: Project[];
  initialProject?: Project | null | undefined;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);
  const [isParsingImage, setIsParsingImage] = useState(false);

  const [pendingTodo, setPendingTodo] = useState<{
    title: string;
    description: string;
    project?: Project;
    priority?: number;
    scheduledDate?: Date;
    scheduledTime?: string;
    durationMinutes: string;
  }>({
    title: "",
    description: "",
    durationMinutes: "",
    project: initialProject || undefined,
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newTodo: {
      title: string;
      description: string;
      scheduled_date?: Date;
      project_id?: number;
      duration_minutes?: number;
      parent_todo_id?: string;
    }) => {
      console.log("Sending todo request: ", newTodo);
      return apiRequest("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newTodo),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: listUserTodos,
      });
      if (pendingTodo.project) {
        queryClient.invalidateQueries({
          queryKey: listProjectTodos(pendingTodo.project.id),
        });
      }
      resetForm();
      if (!createMore) {
        setOpen(false);
      }
    },
  });
  const createTodo = useCallback(() => {
    if (!pendingTodo.title) {
      setError("Title is required");
      return;
    }
    if (pendingTodo.title.length < 3) {
      setError("Title must be at least 3 characters long");
      return;
    }
    setError(null);
    mutation.mutate({
      title: pendingTodo.title,
      description: pendingTodo.description,
      duration_minutes: pendingTodo.durationMinutes
        ? parseInt(pendingTodo.durationMinutes)
        : undefined,
      scheduled_date: combineDate(
        pendingTodo.scheduledDate,
        pendingTodo.scheduledTime,
      ),
      project_id: pendingTodo.project?.id,
    });
  }, [pendingTodo, mutation, setError]);

  function resetForm() {
    setPendingTodo({
      title: "",
      description: "",
      durationMinutes: "",
      project: initialProject || undefined,
    });
  }

  function handleImageToTextClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        setIsParsingImage(true);
        const response = await imageQueries.imageToText().queryFn(file);

        // Append the extracted text to the existing description
        if (response.text && response.text.length > 0) {
          const extractedText = response.text;
          const currentDescription = pendingTodo.description;
          const newDescription = currentDescription
            ? `${currentDescription}\n\n${extractedText}`
            : extractedText;
          setPendingTodo({
            ...pendingTodo,
            description: newDescription,
          });
        }
      } catch (error) {
        console.error("Error extracting text from image:", error);
      } finally {
        setIsParsingImage(false);
      }
    }
  }

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "t" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Only trigger if not focused on an input element
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.closest("#prosemirror-editor"))
        ) {
          return;
        }

        event.preventDefault();
        setOpen(true);
      }

      // Handle Cmd/Ctrl + Enter to create todo
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && open) {
        event.preventDefault();
        createTodo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen, open, createTodo]);

  useEffect(() => {
    setPendingTodo((prev) => ({
      ...prev,
      project: initialProject || undefined,
    }));
  }, [initialProject]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        resetForm();
        setOpen(open);
      }}
    >
      <DialogContent
        className="sm:max-w-[60%] p-0 pt-4 top-[25%] md:top-[50%]"
        showCloseButton={false}
        aria-describedby="Create new TODO dialog"
      >
        <DialogHeader className="px-4">
          <DialogTitle>
            <input
              type="text"
              placeholder="Todo Title"
              data-slot="input"
              ref={titleRef}
              className="outline-none w-full"
              value={pendingTodo.title}
              onChange={(e) => {
                setPendingTodo({
                  ...pendingTodo,
                  title: e.target.value,
                });
              }}
            />
          </DialogTitle>
        </DialogHeader>
        <div className="flex space-y-4 flex-col px-4">
          <ProseMirrorEditor
            className="outline-none resize-none text-sm w-full"
            initialMarkdown={pendingTodo?.description || ""}
            placeholder="Add a description..."
            setMarkdown={(md) => {
              setPendingTodo({
                ...pendingTodo,
                description: md,
              });
            }}
          />
          <div className="flex flex-row space-x-2">
            <ProjectDropdown
              projects={projects}
              selectedProject={pendingTodo.project}
              setSelectedProject={(proj) => {
                setPendingTodo({
                  ...pendingTodo,
                  project: proj,
                });
              }}
            />
            <DateDropdown
              selectedDate={pendingTodo.scheduledDate}
              setSelectedDate={(date) => {
                setPendingTodo({
                  ...pendingTodo,
                  scheduledDate: date,
                });
              }}
              selectedTime={pendingTodo.scheduledTime}
              setSelectedTime={(time) => {
                setPendingTodo({
                  ...pendingTodo,
                  scheduledTime: time,
                });
              }}
              duration={pendingTodo.durationMinutes}
              setDuration={(duration) => {
                setPendingTodo({
                  ...pendingTodo,
                  durationMinutes: duration,
                });
              }}
            />
            <SmallButton
              onClick={handleImageToTextClick}
              disabled={isParsingImage}
            >
              {isParsingImage ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ScanEye />
              )}
              {isParsingImage ? "Parsing..." : "Image to Text"}
            </SmallButton>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
            {/* <SmallButton>
              <CircleAlert />
              Priority
            </SmallButton>
            <SmallButton>
              <Tags />
              Tags
            </SmallButton> */}
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
                setOpen(false);
                setCreateMore(false);
              }}
            >
              Cancel
            </Button>
            <div className="flex space-x-4 items-center">
              <div className="flex space-x-2 items-center">
                <Switch checked={createMore} onCheckedChange={setCreateMore} />
                <span className="text-xs">Create More</span>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!pendingTodo.title || mutation.isPending}
                onClick={createTodo}
              >
                {mutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
