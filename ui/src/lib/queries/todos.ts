import type { Todo } from "../types";
import { listProjectTodos, listUserTodos } from "./keys";

export const todoQueries = {
  listUserTodos: () => ({
    queryKey: listUserTodos,
    queryFn: async () => {
      return await fetch("/api/todos", {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch projects");
          }
          return res.json() as Promise<Todo[]>;
        })
        .then((todos) =>
          todos.map((todo) => ({
            ...todo,
            assigned_date: todo.assigned_date
              ? new Date(todo.assigned_date)
              : null,
          })),
        );
    },
  }),
  listProjectTodos: (projectId: number) => ({
    queryKey: listProjectTodos(projectId),
    queryFn: async () => {
      return await fetch(`/api/todos?project_id=${projectId}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch projects");
          }
          return res.json() as Promise<Todo[]>;
        })
        .then((todos) =>
          todos.map((todo) => ({
            ...todo,
            assigned_date: todo.assigned_date
              ? new Date(todo.assigned_date)
              : null,
          })),
        );
    },
  }),
};
