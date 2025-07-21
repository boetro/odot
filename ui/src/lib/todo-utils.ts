import type { Todo } from "./types";

export function createTodo(
  title: string,
  start: Date,
  duration = 60,
  options: Partial<Todo> = {},
): Todo {
  const end = new Date(start.getTime() + duration * 60 * 1000);

  return {
    id: crypto.randomUUID(),
    title,
    start,
    end,
    allDay: false,
    completed: false,
    priority: "medium",
    ...options,
  };
}

export function getTodoColor(todo: Todo): string {
  if (todo.completed) return "#6b7280"; // gray

  // TODO fix this
  return "#3b82f6";
}

export function formatTodoDuration(start: Date, durationMins: number): string {
  const duration = Math.round(
    (start.getTime() + durationMins * 60 * 1000 - start.getTime()) /
      (1000 * 60),
  );
  if (duration < 60) {
    return `${duration}m`;
  }
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
