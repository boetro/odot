import DateDropdown from "@/components/date-dropdown";
import ProjectDropdown from "@/components/project-dropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { getTodo, listProjectTodos, listUserTodos } from "@/lib/queries/keys";
import { todoQueries } from "@/lib/queries/todos";
import { projectQueries } from "@/lib/queries/projects";
import type { Todo } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/(app)/todos/$todoId")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.prefetchQuery(
      todoQueries.getTodo(parseInt(params.todoId)),
    );
  },
});

function RouteComponent() {
  const params = Route.useParams();
  const queryClient = useQueryClient();

  const updateTodoMutation = useMutation({
    mutationFn: ({ todo }: { todo: Todo }) => {
      return fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(todo),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: listUserTodos });
      queryClient.invalidateQueries({ queryKey: getTodo(variables.todo.id) });
      if (variables.todo.project_id)
        queryClient.invalidateQueries({
          queryKey: listProjectTodos(variables.todo.project_id),
        });
    },
  });

  const { data: todo, isLoading: todoLoading } = useQuery(
    todoQueries.getTodo(parseInt(params.todoId)),
  );

  const { data: projects = [] } = useQuery(projectQueries.listProjects());

  const [pendingTodo, setPendingTodo] = useState<Todo | null>(null);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = useState<string | undefined>(undefined);
  const [tempDuration, setTempDuration] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    if (todo) {
      setPendingTodo(todo);
      // Initialize temp values
      setTempDate(
        todo.scheduled_date ? new Date(todo.scheduled_date) : undefined,
      );
      setTempTime(
        todo.scheduled_date
          ? (() => {
              const date = new Date(todo.scheduled_date);
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const duration = todo.duration_minutes || 0;
              if (hours === 0 && minutes === 0 && duration === 0) {
                return undefined;
              }
              return date.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              });
            })()
          : undefined,
      );
      setTempDuration(todo.duration_minutes?.toString() || "");
    }
  }, [todo]);

  function calculateTextareaRows(text: string): number {
    if (!text) return 1;
    const lines = text.split("\n").length;
    return Math.max(1, lines); // Min 1 row, no max
  }

  function hasChanges(toSave: Todo | null) {
    if (!todo || !toSave) return false;
    return (
      todo.title !== toSave.title ||
      todo.description !== toSave.description ||
      todo.completed !== toSave.completed ||
      todo.scheduled_date !== toSave.scheduled_date ||
      todo.duration_minutes !== toSave.duration_minutes ||
      todo.project_id !== toSave.project_id
    );
  }

  function handleSave(toSave: Todo | null) {
    if (toSave && hasChanges(toSave)) {
      updateTodoMutation.mutate({ todo: toSave });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSave(pendingTodo);
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSave(pendingTodo);
      (e.target as HTMLTextAreaElement).blur();
    }
  }

  return (
    <div className="grid grid-cols-4 h-full">
      {todoLoading || !todo || !pendingTodo ? (
        "Loading..."
      ) : (
        <>
          <div className="w-full h-full py-8 px-12 col-span-3">
            <div className="flex flex-col gap-8">
              <input
                className="outline-none text-2xl font-semibold"
                type="text"
                value={pendingTodo?.title || ""}
                onChange={(e) =>
                  setPendingTodo(
                    pendingTodo
                      ? {
                          ...pendingTodo,
                          title: e.target.value,
                        }
                      : null,
                  )
                }
                onKeyDown={handleKeyDown}
                onBlur={() => handleSave(pendingTodo)}
              />
              {isEditingDescription ? (
                <textarea
                  className="outline-none resize-none"
                  value={pendingTodo?.description || ""}
                  onChange={(e) =>
                    setPendingTodo(
                      pendingTodo
                        ? {
                            ...pendingTodo,
                            description: e.target.value || null,
                          }
                        : null,
                    )
                  }
                  onKeyDown={handleDescriptionKeyDown}
                  onBlur={() => {
                    handleSave(pendingTodo);
                    setIsEditingDescription(false);
                  }}
                  placeholder="Add a description..."
                  rows={calculateTextareaRows(pendingTodo?.description || "")}
                  autoFocus
                />
              ) : (
                <div
                  className="min-h-[1.5em] cursor-text"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {pendingTodo?.description ? (
                    <div className="prose max-w-none dark:prose-invert [&_li:has([data-slot=checkbox])]:flex [&_li:has([data-slot=checkbox])]:items-center [&_li:has([data-slot=checkbox])]:gap-2 [&_li:has([data-slot=checkbox])]:list-none [&_li_p]:m-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          input: ({ checked }) => (
                            <Checkbox
                              className="not-prose"
                              defaultChecked={checked}
                              onClick={(e) => e.stopPropagation()}
                            />
                            // <input
                            //   {...props}
                            //   type="checkbox"
                            //   checked={checked}
                            //   disabled={false}
                            //   onChange={(e) => {
                            //     e.stopPropagation();
                            //     if (pendingTodo?.description) {
                            //       const lines =
                            //         pendingTodo.description.split("\n");
                            //       const target = e.target as HTMLInputElement;
                            //       const listItem = target.closest("li");
                            //       if (listItem) {
                            //         const allCheckboxes =
                            //           document.querySelectorAll(
                            //             'input[type="checkbox"]',
                            //           );
                            //         const checkboxIndex =
                            //           Array.from(allCheckboxes).indexOf(target);
                            //         let currentCheckboxIndex = 0;

                            //         const updatedLines = lines.map((line) => {
                            //           if (line.match(/^\s*[-*+]\s*\[[ x]\]/)) {
                            //             if (
                            //               currentCheckboxIndex === checkboxIndex
                            //             ) {
                            //               const newState = target.checked
                            //                 ? "x"
                            //                 : " ";
                            //               return line.replace(
                            //                 /\[[ x]\]/,
                            //                 `[${newState}]`,
                            //               );
                            //             }
                            //             currentCheckboxIndex++;
                            //           }
                            //           return line;
                            //         });

                            //         const newDescription =
                            //           updatedLines.join("\n");
                            //         const newTodo = {
                            //           ...pendingTodo,
                            //           description: newDescription,
                            //         };
                            //         setPendingTodo(newTodo);
                            //         handleSave(newTodo);
                            //       }
                            //     }
                            //   }}
                            //   onClick={(e) => e.stopPropagation()}
                            // />
                          ),
                        }}
                      >
                        {pendingTodo.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Add a description...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="h-full border-l bg-muted/20 flex flex-col gap-5 p-3 text-sm">
            <span className="text-muted-foreground p-1">Details</span>
            <div className="flex flex-row gap-4 items-center p-1">
              <Checkbox
                checked={pendingTodo.completed}
                onCheckedChange={(checked) => {
                  const isChecked = Boolean(checked);
                  if (pendingTodo) {
                    const newTodo = { ...pendingTodo, completed: isChecked };
                    setPendingTodo(newTodo);
                    handleSave(newTodo);
                  }
                }}
              />
              <span>{pendingTodo.completed ? "Done" : "TODO"}</span>
            </div>
            <DateDropdown
              selectedDate={tempDate}
              setSelectedDate={setTempDate}
              selectedTime={tempTime}
              setSelectedTime={setTempTime}
              duration={tempDuration}
              setDuration={setTempDuration}
              onClose={() => {
                if (pendingTodo) {
                  // Apply temp changes to pendingTodo and save
                  let newScheduledDate: Date | null = null;
                  if (tempDate) {
                    newScheduledDate = new Date(tempDate);
                    if (tempTime) {
                      const [hours, minutes] = tempTime.split(":").map(Number);
                      newScheduledDate.setHours(hours, minutes, 0, 0);
                    }
                  }

                  const newTodo = {
                    ...pendingTodo,
                    scheduled_date: newScheduledDate,
                    duration_minutes: tempDuration
                      ? parseInt(tempDuration)
                      : null,
                  };
                  setPendingTodo(newTodo);
                  handleSave(newTodo);
                }
              }}
              variant="large"
            />
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">Project</span>
              <ProjectDropdown
                selectedProject={
                  projects.find((p) => p.id === pendingTodo.project_id) || null
                }
                setSelectedProject={(project) => {
                  if (pendingTodo) {
                    const newTodo = {
                      ...pendingTodo,
                      project_id: project?.id || null,
                    };
                    setPendingTodo(newTodo);
                    handleSave(newTodo);
                  }
                }}
                projects={projects}
                variant="large"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
