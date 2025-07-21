"use client";

import * as React from "react";
import { Box, Check } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Project, Todo } from "@/lib/types";
import { useNavigate } from "@tanstack/react-router";

interface SearchProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projects: Project[];
  todos: Todo[];
}

export default function SearchDialog({
  open,
  setOpen,
  projects,
  todos,
}: SearchProps) {
  const [query, setQuery] = React.useState("");
  const navigate = useNavigate();

  // Handle keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  const searchSuggestions = React.useMemo(
    () => ({
      projects: projects,
      todos: todos,
    }),
    [projects, todos],
  );

  const filteredSuggestions = React.useMemo(() => {
    return {
      projects: searchSuggestions.projects.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      ),
      todos: searchSuggestions.todos.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()),
      ),
    };
  }, [query, searchSuggestions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 shadow-lg h-100"
        showCloseButton={false}
      >
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search..."
            value={query}
            onValueChange={handleSearch}
          />
          <CommandList className="max-h-full">
            {filteredSuggestions.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {filteredSuggestions.projects.slice(0, 5).map((proj) => (
                  <CommandItem
                    key={proj.id}
                    className="flex items-center gap-2"
                    onSelect={() => {
                      navigate({
                        to: "/projects/$projectId",
                        params: {
                          projectId: proj.id.toString(),
                        },
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4" style={{ color: proj.color }} />
                      <span>{proj.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredSuggestions.todos.length > 0 && (
              <CommandGroup heading="TODOs">
                {filteredSuggestions.todos.slice(0, 5).map((todo) => (
                  <CommandItem
                    key={todo.id}
                    className="flex items-center gap-2"
                    onSelect={() => {
                      navigate({
                        to: "/todos/$todoId",
                        params: {
                          todoId: todo.id.toString(),
                        },
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>{todo.title}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
