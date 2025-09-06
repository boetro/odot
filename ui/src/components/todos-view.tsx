import type { Project, Todo } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import {
  ArrowDownIcon,
  ArrowUpDown,
  ArrowUpIcon,
  Box,
  Calendar,
  ChevronDownIcon,
  ChevronRight,
  Columns3,
  Filter,
  Group,
  ListTodo,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import React, { useMemo, useState, useCallback } from "react";
import { TooltipContent, TooltipTrigger, Tooltip } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodo, listProjectTodos, listUserTodos } from "@/lib/queries/keys";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { TodoCalendar } from "./todo-calendar";
import { Link } from "@tanstack/react-router";
import {
  type Grouping,
  type Ordering,
  type TodoViewState,
} from "@/hooks/todos-view-store";
import { apiRequest } from "@/lib/api";

type TodoWithProject = Todo & {
  project?: Project;
};

/**
 * This function takes in a Date object and should return a short date (e.g. Jan 17)
 */
function truncateDate(date: Date) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  return `${month} ${day}`;
}

function formatTime(startDate: Date, minutes: number) {
  const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
  return endDate.toLocaleTimeString();
}

function TodoBoard({
  groupedTodos,
  viewState,
}: {
  groupedTodos:
    | {
        key: string;
        groupData:
          | {
              project: Project | null;
            }
          | undefined;
        todos: TodoWithProject[];
      }[]
    | null;
  viewState: TodoViewState;
}) {
  // TODO: figure out a way to remove this duplication
  const queryClient = useQueryClient();
  const [animatingOut, setAnimatingOut] = useState<Set<number>>(new Set());
  const [displayTodos, setDisplayTodos] =
    useState<typeof groupedTodos>(groupedTodos);

  // Track todos that are disappearing and animate them out
  React.useEffect(() => {
    if (!displayTodos || !groupedTodos) {
      setDisplayTodos(groupedTodos);
      return;
    }

    // Find todos that were in displayTodos but are not in current groupedTodos
    const currentTodoIds = new Set(
      groupedTodos.flatMap((group) => group.todos.map((todo) => todo.id)),
    );
    const displayTodoIds = displayTodos.flatMap((group) =>
      group.todos.map((todo) => todo.id),
    );

    const disappearingTodoIds = displayTodoIds.filter(
      (id) => !currentTodoIds.has(id),
    );

    if (disappearingTodoIds.length > 0) {
      // Start animation for disappearing todos
      setAnimatingOut(new Set(disappearingTodoIds));

      // After animation duration, update displayTodos to match current groupedTodos
      setTimeout(() => {
        setDisplayTodos(groupedTodos);
        setAnimatingOut(new Set());
      }, 300); // Animation duration
    } else {
      // No animations needed, update immediately
      setDisplayTodos(groupedTodos);
    }
  }, [groupedTodos, displayTodos]);

  const completeTodoMutation = useMutation({
    mutationFn: ({ todo, completed }: { todo: Todo; completed: boolean }) => {
      return apiRequest(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed,
          title: todo.title,
          description: todo.description,
          scheduled_date: todo.scheduled_date,
          duration_minutes: todo.duration_minutes,
          parent_todo_id: todo.parent_todo_id,
          project_id: todo.project_id,
        }),
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
  return (
    <div className="flex flex-row px-2 overflow-auto h-full">
      {displayTodos?.map((group) => (
        <React.Fragment key={group.key}>
          <div className="w-60 h-full flex-shrink-0 flex flex-col">
            <div className="flex flex-row gap-2 items-center pb-2 flex-shrink-0 ml-4">
              {viewState.grouping === "project" && (
                <Box
                  className="size-4"
                  style={{
                    color: group.groupData?.project?.color || "inherit",
                  }}
                />
              )}
              <span>
                {viewState.grouping === "project"
                  ? group.groupData?.project?.name || "no project"
                  : group.key}
              </span>
            </div>
            <div className="flex flex-col space-y-2 overflow-y-auto flex-1 px-2 pt-2">
              {group.todos.map((todo) => (
                <Card
                  key={todo.id}
                  className={cn(
                    "rounded-sm border-0 ring-1 ring-border overflow-hidden p-0 flex-shrink-0 transition-all duration-300 ease-out",
                    animatingOut.has(todo.id)
                      ? "opacity-0 translate-x-4 scale-95"
                      : "opacity-100 translate-x-0 scale-100",
                  )}
                >
                  <Link
                    to="/todos/$todoId"
                    params={{ todoId: todo.id.toString() }}
                    className="flex flex-col gap-2 hover:bg-muted p-2 hover:cursor-pointer w-full"
                  >
                    <div className="flex flex-row items-start gap-2">
                      <div
                        className="flex items-start pt-[2px]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            completeTodoMutation.mutate({
                              todo: todo,
                              completed: isChecked,
                            });
                          }}
                        />
                      </div>
                      <div className="text-start text-sm font-medium flex-1">
                        {todo.title}
                      </div>
                    </div>
                    <div className="flex flex-row space-x-2 text-xs pl-6">
                      {todo.project && (
                        <span
                          className="border rounded-sm p-0.5"
                          style={{
                            borderColor: todo.project.color,
                          }}
                        >
                          {todo.project.name}
                        </span>
                      )}
                      {todo.scheduled_date && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="border rounded-sm p-0.5">
                              {truncateDate(todo.scheduled_date)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {todo.scheduled_date.getHours() === 0 &&
                            todo.scheduled_date.getMinutes() === 0 &&
                            !todo.duration_minutes
                              ? todo.scheduled_date.toLocaleDateString()
                              : todo.scheduled_date.toLocaleTimeString()}
                            {todo.duration_minutes && (
                              <span className="ml-2">
                                -{" "}
                                {formatTime(
                                  todo.scheduled_date,
                                  todo.duration_minutes,
                                )}
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
          {/* <Separator orientation="vertical" className="h-full" /> */}
        </React.Fragment>
      ))}
    </div>
  );
}

function TodoList({
  groupedTodos,
  sortedTodos,
  collapsedGroups,
  setCollapsedGroups,
  viewState,
}: {
  groupedTodos:
    | {
        key: string;
        groupData:
          | {
              project: Project | null;
            }
          | undefined;
        todos: TodoWithProject[];
      }[]
    | null;
  sortedTodos: TodoWithProject[];
  collapsedGroups: string[];
  setCollapsedGroups: (groups: string[]) => void;
  viewState: TodoViewState;
}) {
  const [animatingOut, setAnimatingOut] = useState<Set<number>>(new Set());
  const [displayGroupedTodos, setDisplayGroupedTodos] =
    useState<typeof groupedTodos>(groupedTodos);
  const [displaySortedTodos, setDisplaySortedTodos] =
    useState<TodoWithProject[]>(sortedTodos);

  // Track todos that are disappearing and animate them out
  React.useEffect(() => {
    if (groupedTodos === null) {
      // Handle ungrouped todos
      if (!displaySortedTodos || !sortedTodos) {
        setDisplaySortedTodos(sortedTodos);
        return;
      }

      const currentTodoIds = new Set(sortedTodos.map((todo) => todo.id));
      const displayTodoIds = displaySortedTodos.map((todo) => todo.id);

      const disappearingTodoIds = displayTodoIds.filter(
        (id) => !currentTodoIds.has(id),
      );

      if (disappearingTodoIds.length > 0) {
        setAnimatingOut(new Set(disappearingTodoIds));

        setTimeout(() => {
          setDisplaySortedTodos(sortedTodos);
          setAnimatingOut(new Set());
        }, 300);
      } else {
        setDisplaySortedTodos(sortedTodos);
      }
    } else {
      // Handle grouped todos
      if (!displayGroupedTodos || !groupedTodos) {
        setDisplayGroupedTodos(groupedTodos);
        return;
      }

      const currentTodoIds = new Set(
        groupedTodos.flatMap((group) => group.todos.map((todo) => todo.id)),
      );
      const displayTodoIds = displayGroupedTodos.flatMap((group) =>
        group.todos.map((todo) => todo.id),
      );

      const disappearingTodoIds = displayTodoIds.filter(
        (id) => !currentTodoIds.has(id),
      );

      if (disappearingTodoIds.length > 0) {
        setAnimatingOut(new Set(disappearingTodoIds));

        setTimeout(() => {
          setDisplayGroupedTodos(groupedTodos);
          setAnimatingOut(new Set());
        }, 300);
      } else {
        setDisplayGroupedTodos(groupedTodos);
      }
    }
  }, [groupedTodos, sortedTodos, displayGroupedTodos, displaySortedTodos]);
  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      {displayGroupedTodos === null &&
        displaySortedTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            isAnimatingOut={animatingOut.has(todo.id)}
          />
        ))}
      {displayGroupedTodos !== null &&
        displayGroupedTodos.map((group) => (
          <Collapsible
            key={group.key}
            open={collapsedGroups.find((id) => id === group.key) === undefined}
            onOpenChange={(open) => {
              if (!open) {
                setCollapsedGroups([...collapsedGroups, group.key]);
              } else {
                setCollapsedGroups(
                  collapsedGroups.filter((id) => id !== group.key),
                );
              }
            }}
          >
            <CollapsibleTrigger className="w-full bg-card">
              <div className="flex space-x-2 items-center text-sm p-2">
                {collapsedGroups.find((id) => id === group.key) ===
                undefined ? (
                  <ChevronDownIcon className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {viewState.grouping === "project" && (
                  <Box
                    className="size-4"
                    style={{
                      color: group.groupData?.project?.color || "inherit",
                    }}
                  />
                )}
                <span>
                  {viewState?.grouping === "project"
                    ? group.groupData?.project?.name || "No Project"
                    : group.key}
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {group.todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isAnimatingOut={animatingOut.has(todo.id)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
    </div>
  );
}

function TodoItem({
  todo,
  isAnimatingOut = false,
}: {
  todo: TodoWithProject;
  isAnimatingOut?: boolean;
}) {
  const queryClient = useQueryClient();

  const completeTodoMutation = useMutation({
    mutationFn: ({ todo, completed }: { todo: Todo; completed: boolean }) => {
      return apiRequest(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed,
          title: todo.title,
          description: todo.description,
          scheduled_date: todo.scheduled_date,
          duration_minutes: todo.duration_minutes,
          parent_todo_id: todo.parent_todo_id,
          project_id: todo.project_id,
        }),
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

  return (
    <div
      key={todo.id}
      className={cn(
        "flex items-center gap-2 hover:bg-muted p-2 transition-all duration-300 ease-out",
        isAnimatingOut
          ? "opacity-0 translate-x-4 scale-95"
          : "opacity-100 translate-x-0 scale-100",
      )}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={(checked) => {
          const isChecked = Boolean(checked);
          completeTodoMutation.mutate({
            todo: todo,
            completed: isChecked,
          });
        }}
      />
      <Link
        to="/todos/$todoId"
        params={{ todoId: todo.id.toString() }}
        className="flex flex-row hover:cursor-pointer justify-between w-full"
      >
        <div className="text-start text-sm">{todo.title}</div>
        <div className="text-xs space-x-2">
          {todo.project && (
            <span
              className="border rounded-sm p-0.5"
              style={{
                borderColor: todo.project.color,
              }}
            >
              {todo.project.name}
            </span>
          )}
          {todo.scheduled_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="border rounded-sm p-0.5">
                  {truncateDate(todo.scheduled_date)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {todo.scheduled_date.getHours() === 0 &&
                todo.scheduled_date.getMinutes() === 0 &&
                !todo.duration_minutes
                  ? todo.scheduled_date.toLocaleDateString()
                  : todo.scheduled_date.toLocaleTimeString()}
                {todo.duration_minutes && (
                  <span className="ml-2">
                    - {formatTime(todo.scheduled_date, todo.duration_minutes)}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function TodosView({
  todos,
  projects,
  useTodoView,
}: {
  todos: Todo[];
  projects: Project[];
  useTodoView: () => TodoViewState;
}) {
  const todosWithProjects = useMemo((): TodoWithProject[] => {
    return todos.map((todo) => ({
      ...todo,
      project: todo.project_id
        ? projects.find((project) => project.id === todo.project_id)
        : undefined,
    }));
  }, [todos, projects]);

  const viewState = useTodoView();

  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const updateCollapsedGroups = useCallback((groups: string[]) => {
    setCollapsedGroups(groups);
  }, []);

  const filteredTodos = useMemo(() => {
    return todosWithProjects.filter((todo) => {
      if (!viewState.filters.showTODO && !todo.completed) return false;
      if (!viewState.filters.showCompleted && todo.completed) return false;
      if (!viewState.filters.showWithNoProject && !todo.project) return false;
      if (
        viewState.filters.visibleProjectIds != null &&
        todo.project &&
        !viewState.filters.visibleProjectIds[todo.project?.id || -1]
      )
        return false;
      return true;
    });
  }, [todosWithProjects, viewState]);

  const sortedTodos = useMemo(() => {
    return [...filteredTodos].sort((a, b) => {
      let result = 0;

      if (viewState.ordering === "status") {
        result = a.completed === b.completed ? 0 : a.completed ? 1 : -1;
      } else if (viewState.ordering === "scheduledDate") {
        if (!a.scheduled_date && !b.scheduled_date) result = 0;
        else if (!a.scheduled_date) result = 1;
        else if (!b.scheduled_date) result = -1;
        else result = a.scheduled_date.getTime() - b.scheduled_date.getTime();
      } else {
        result = a.title.localeCompare(b.title);
      }

      return (viewState.sortDirection ?? "asc") === "desc" ? -result : result;
    });
  }, [viewState.ordering, viewState.sortDirection, filteredTodos]);

  const groupedTodos = useMemo(() => {
    if (!viewState.grouping) return null;

    const grouped = sortedTodos.reduce(
      (acc, todo) => {
        let key: string;
        let groupData: { type: "project"; project: Project | null } | undefined;

        if (viewState.grouping === "project") {
          const project = todo.project || null;
          key = project ? `__project_id:${project.id}` : "__zno_project";
          groupData = { type: "project", project };
        } else {
          key = todo.completed ? "Completed" : "TODO";
        }

        if (!acc[key]) {
          acc[key] = {
            groupData,
            todos: [],
          };
        }
        acc[key].todos.push(todo);
        return acc;
      },
      {} as Record<
        string,
        {
          groupData: { project: Project | null } | undefined;
          todos: TodoWithProject[];
        }
      >,
    );

    const result = Object.entries(grouped).map(
      ([key, { groupData, todos }]) => ({
        key,
        groupData,
        todos,
      }),
    );
    result.sort((a, b) => a.key.localeCompare(b.key));
    return result;
  }, [sortedTodos, viewState.grouping]);

  return (
    <div className="py-2 space-y-4 flex flex-col h-full w-full">
      <div className="flex flex-row justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="flex items-center text-xs gap-2"
              variant="ghost"
              size="sm"
            >
              <Filter className="size-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44" align="start">
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs"
                    >
                      <Checkbox
                        checked={viewState.filters.showTODO}
                        className="data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:text-white dark:data-[state=checked]:border-slate-700 dark:data-[state=checked]:bg-slate-700"
                        onCheckedChange={(checked) =>
                          viewState.setShowCompleted(Boolean(checked))
                        }
                      />
                      TODO
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs"
                    >
                      <Checkbox
                        checked={viewState.filters.showCompleted}
                        className="data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:text-white dark:data-[state=checked]:border-slate-700 dark:data-[state=checked]:bg-slate-700"
                        onCheckedChange={(checked) =>
                          viewState.setShowCompleted(Boolean(checked))
                        }
                      />
                      Completed
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Project
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center space-x-1 text-xs"
                    >
                      <Checkbox
                        checked={viewState.filters.showWithNoProject}
                        className="data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:text-white dark:data-[state=checked]:border-slate-700 dark:data-[state=checked]:bg-slate-700"
                        onCheckedChange={(checked) =>
                          viewState.setShowWithNoProject(Boolean(checked))
                        }
                      />
                      <Box className="size-4" />
                      <span>(no project)</span>
                    </DropdownMenuItem>
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onSelect={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 text-xs"
                      >
                        <Checkbox
                          checked={
                            viewState.filters.visibleProjectIds === null ||
                            viewState.filters.visibleProjectIds[project.id]
                          }
                          className="data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:text-white dark:data-[state=checked]:border-slate-700 dark:data-[state=checked]:bg-slate-700"
                          onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            if (isChecked) {
                              viewState.addVisibleProjectId(project.id);
                            } else {
                              viewState.removeVisibleProjectId(project.id);
                            }
                          }}
                        />
                        <Box
                          className="size-4"
                          style={{ color: project.color }}
                        />
                        <span>{project.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="flex items-center text-xs gap-2"
              variant="outline"
              size="sm"
            >
              <SlidersHorizontal className="size-4" />
              View
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 py-2" align="end">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row space-x-2 w-full items-center justify-center">
                <button
                  className={cn(
                    "rounded-sm h-12 w-full items-center justify-center flex flex-col text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                    viewState.view === "list"
                      ? "dark:border-primary/50 border-primary/50 dark:bg-accent bg-accent"
                      : "",
                  )}
                  onClick={() => viewState.setView("list")}
                >
                  <ListTodo className="size-4" />
                  <span>List</span>
                </button>
                <button
                  className={cn(
                    "rounded-sm h-12 w-full items-center justify-center flex flex-col text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                    viewState.view === "board"
                      ? "dark:border-primary/50 border-primary/50 dark:bg-accent bg-accent"
                      : "",
                  )}
                  onClick={() => viewState.setView("board")}
                >
                  <Columns3 className="size-4" />
                  Board
                </button>
                <button
                  className={cn(
                    "rounded-sm h-12 w-full items-center justify-center flex flex-col text-xs border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                    viewState.view === "calendar"
                      ? "dark:border-primary/50 border-primary/50 dark:bg-accent bg-accent"
                      : "",
                  )}
                  onClick={() => viewState.setView("calendar")}
                >
                  <Calendar className="size-4" />
                  Calendar
                </button>
              </div>
              <div className="grid grid-cols-3 text-xs items-center">
                <div className="flex space-x-2 ">
                  <Group className="size-4" />
                  <span>Grouping</span>
                </div>
                <Select
                  value={viewState.grouping || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      viewState.setGrouping(null);
                    } else {
                      // Always open all groups when changing grouping
                      setCollapsedGroups([]);
                      viewState.setGrouping(value as Grouping);
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="text-xs w-full col-span-2"
                  >
                    <SelectValue placeholder="Grouping..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {viewState.view !== "board" && (
                        <SelectItem className="text-xs" value="none">
                          No Grouping
                        </SelectItem>
                      )}
                      <SelectItem className="text-xs" value="project">
                        Project
                      </SelectItem>
                      <SelectItem className="text-xs" value="status">
                        Status
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 text-xs items-center">
                <div className="flex space-x-2 items-center">
                  <ArrowUpDown className="size-4" />
                  <span>Order By</span>
                </div>
                <div className="flex flex-row space-x-1 col-span-2">
                  <Select
                    value={viewState.ordering ?? "status"}
                    onValueChange={(value) =>
                      viewState.setOrdering(value as Ordering)
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="text-xs w-full col-span-2"
                    >
                      <SelectValue placeholder="Order by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem className="text-xs" value="title">
                          Title
                        </SelectItem>
                        <SelectItem className="text-xs" value="status">
                          Status
                        </SelectItem>
                        <SelectItem className="text-xs" value="scheduledDate">
                          Scheduled Date
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() =>
                      viewState.setSortDirection(
                        (viewState.sortDirection ?? "asc") === "asc"
                          ? "desc"
                          : "asc",
                      )
                    }
                  >
                    {(viewState.sortDirection ?? "asc") === "asc" ? (
                      <ArrowUpIcon />
                    ) : (
                      <ArrowDownIcon />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex overflow-hidden flex-1 h-full w-full">
        {viewState.view === "list" && (
          <TodoList
            groupedTodos={groupedTodos}
            sortedTodos={sortedTodos}
            viewState={viewState}
            collapsedGroups={collapsedGroups}
            setCollapsedGroups={updateCollapsedGroups}
          />
        )}
        {viewState.view === "board" && (
          <TodoBoard groupedTodos={groupedTodos} viewState={viewState} />
        )}
        {viewState.view === "calendar" && (
          <TodoCalendar
            todos={filteredTodos}
            selectedView={viewState.calendarView}
            setSelectedView={viewState.setCalendarView}
          />
        )}
      </div>
    </div>
  );
}
