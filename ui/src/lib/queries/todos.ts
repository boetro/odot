import { apiRequest } from "../api";
import type { Todo } from "../types";
import { listProjectTodos, listUserTodos, getTodo } from "./keys";
import type { QueryClient } from "@tanstack/react-query";

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

export const todoMutations = {
	updateTodo: (queryClient: QueryClient) => ({
		mutationFn: ({ todo }: { todo: Todo }) => {
			return apiRequest(`/api/todos/${todo.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(todo),
			});
		},
		onSuccess: (_: unknown, variables: { todo: Todo; oldProjectId?: number | null }) => {
			queryClient.invalidateQueries({ queryKey: listUserTodos });
			queryClient.invalidateQueries({ queryKey: getTodo(variables.todo.id) });
			// Invalidate the new project query
			if (variables.todo.project_id)
				queryClient.invalidateQueries({
					queryKey: listProjectTodos(variables.todo.project_id),
				});
			// Invalidate the old project query
			if (variables.oldProjectId && variables.oldProjectId !== variables.todo.project_id)
				queryClient.invalidateQueries({
					queryKey: listProjectTodos(variables.oldProjectId),
				});
		},
	}),
	completeTodo: (queryClient: QueryClient) => ({
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
		onSuccess: (_: unknown, variables: { todo: Todo; completed: boolean }) => {
			queryClient.invalidateQueries({ queryKey: listUserTodos });
			queryClient.invalidateQueries({ queryKey: getTodo(variables.todo.id) });
			if (variables.todo.project_id)
				queryClient.invalidateQueries({
					queryKey: listProjectTodos(variables.todo.project_id),
				});
		},
	}),
};
