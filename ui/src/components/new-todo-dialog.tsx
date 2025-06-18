import { Box, Calendar, CircleAlert, Tags } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useEffect, useRef } from "react";
import { Switch } from "./ui/switch";

function SmallButton({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      className="h-6 text-xs rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground"
    >
      {children}
    </Button>
  );
}

export function NewTodoDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[60%] p-0 pt-4"
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
            />
          </DialogTitle>
        </DialogHeader>
        <div className="flex space-y-4 flex-col px-4">
          <textarea
            ref={textareaRef}
            placeholder="Add Description"
            data-slot="textarea"
            className="outline-none text-sm w-full resize-none"
            rows={3}
            onInput={handleTextareaResize}
            style={{ minHeight: "3rem" }}
          />
          <div className="flex flex-row space-x-2">
            <SmallButton>
              <Box />
              Project
            </SmallButton>
            <SmallButton>
              <Calendar />
              Date
            </SmallButton>
            <SmallButton>
              <CircleAlert />
              Priority
            </SmallButton>
            <SmallButton>
              <Tags />
              Tags
            </SmallButton>
          </div>
        </div>
        <DialogFooter className="border-t py-2">
          <div className="flex justify-between px-4 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex space-x-4 items-center">
              <div className="flex space-x-2 items-center">
                <Switch />
                <span className="text-xs">Create More</span>
              </div>
              <Button type="submit" size="sm">
                Create
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
