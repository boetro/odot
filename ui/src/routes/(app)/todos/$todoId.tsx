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
import { ProseMirrorEditor } from "@/components/prosemirror-editor";
import { apiRequest } from "@/lib/api";
import { SmallButton } from "@/components/small-button";
import { useIsMobile } from "@/hooks/use-mobile";

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
		mutationFn: ({ todo, oldProjectId }: { todo: Todo; oldProjectId?: number | null }) => {
			return apiRequest(`/api/todos/${todo.id}`, {
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
	});

	const { data: todo, isLoading: todoLoading } = useQuery(
		todoQueries.getTodo(parseInt(params.todoId)),
	);

	const { data: projects = [] } = useQuery(projectQueries.listProjects());

	const [pendingTodo, setPendingTodo] = useState<Todo | null>(null);
	const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
	const [tempTime, setTempTime] = useState<string | undefined>(undefined);
	const [tempDuration, setTempDuration] = useState<string>("");
	const isMobile = useIsMobile();

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
			updateTodoMutation.mutate({ todo: toSave, oldProjectId: todo?.project_id });
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			handleSave(pendingTodo);
			(e.target as HTMLInputElement).blur();
		}
	}

	return (
		<div className="h-full flex flex-col lg:grid lg:grid-cols-4 overflow-hidden">
			{todoLoading || !todo || !pendingTodo ? (
				"Loading..."
			) : (
				<>
					{/* Mobile: Details at top, Desktop: Sidebar on right */}
					<div className="lg:order-2 lg:h-full lg:border-l lg:bg-muted/20 flex flex-row lg:flex-col gap-1.5 lg:gap-2 p-2 lg:p-3 text-sm border-b lg:border-b-0 overflow-x-auto overflow-y-visible shrink-0">
						<span className="text-muted-foreground p-1 hidden lg:block">Details</span>
						{/* Status Button - styled as button on mobile, traditional on desktop */}
						<SmallButton
							className="lg:hidden"
							onClick={() => {
								if (pendingTodo) {
									const newTodo = { ...pendingTodo, completed: !pendingTodo.completed };
									setPendingTodo(newTodo);
									handleSave(newTodo);
								}
							}}
						>
							<>
								<Checkbox checked={pendingTodo.completed} />
								<span className="whitespace-nowrap">
									{pendingTodo.completed ? "Done" : "TODO"}
								</span>
							</>
						</SmallButton>
						<div className="lg:flex flex-row gap-4 items-center p-1 hidden hover:bg-muted rounded-md">
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
							<button
								onClick={() => {
									if (pendingTodo) {
										const newTodo = { ...pendingTodo, completed: !pendingTodo.completed };
										setPendingTodo(newTodo);
										handleSave(newTodo);
									}
								}}
							>{pendingTodo.completed ? "Done" : "TODO"}</button>
						</div>

						<DateDropdown
							variant={isMobile ? "small" : "large"}
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
						/>

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
							variant={isMobile ? "small" : "large"}
						/>
					</div>

					{/* Mobile: Content below details, Desktop: Left side */}
					<div className="lg:order-1 w-full h-full py-8 px-4 lg:px-12 lg:col-span-3">
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
							<ProseMirrorEditor
								className="outline-none resize-none text-sm"
								initialMarkdown={pendingTodo?.description || ""}
								placeholder="Add a description..."
								setMarkdown={(md) => {
									const newTodo = {
										...pendingTodo,
										description: md,
									};
									setPendingTodo(newTodo);
									handleSave(newTodo);
								}}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
