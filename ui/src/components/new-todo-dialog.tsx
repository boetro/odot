import { CirclePlus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function NewTodoDialog() {
  const [open, setOpen] = useState(false);
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
        event.key === "c" &&
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
            activeElement.contentEditable === "true")
        ) {
          return;
        }

        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear hover:cursor-pointer">
          <CirclePlus />
          <span>Create Todo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[60%]">
        <DialogHeader>
          <DialogTitle>
            <input
              type="text"
              placeholder="Todo Title"
              data-slot="input"
              ref={titleRef}
              className="outline-none"
            />
          </DialogTitle>
        </DialogHeader>
        <div>
          <textarea
            ref={textareaRef}
            placeholder="Add Description"
            data-slot="textarea"
            className="outline-none text-sm w-full resize-none"
            rows={3}
            onInput={handleTextareaResize}
            style={{ minHeight: "3rem" }}
          />
        </div>
        <DialogFooter>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
