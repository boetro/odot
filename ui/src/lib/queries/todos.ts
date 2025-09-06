import { apiRequest } from "../api";
import type { Todo } from "../types";
import { listProjectTodos, listUserTodos, getTodo } from "./keys";

export const todoQueries = {
  listUserTodos: () => ({
    queryKey: listUserTodos,
    queryFn: async () => {
      return await apiRequest("/api/todos", {
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
            scheduled_date: todo.scheduled_date
              ? new Date(todo.scheduled_date)
              : null,
          })),
        );
    },
    staleTime: 1000 * 60 * 5,
  }),
  listProjectTodos: (projectId: number) => ({
    queryKey: listProjectTodos(projectId),
    queryFn: async () => {
      return await apiRequest(`/api/todos?project_id=${projectId}`, {
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
            scheduled_date: todo.scheduled_date
              ? new Date(todo.scheduled_date)
              : null,
          })),
        );
    },
  }),
  getTodo: (todoId: number | null) => ({
    queryKey: getTodo(todoId!),
    queryFn: async () => {
      return await apiRequest(`/api/todos/${todoId}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch todo");
          }
          return res.json() as Promise<Todo>;
        })
        .then((todo) => ({
          ...todo,
          scheduled_date: todo.scheduled_date
            ? new Date(todo.scheduled_date)
            : null,
        }));
    },
    enabled: !!todoId,
  }),
};
