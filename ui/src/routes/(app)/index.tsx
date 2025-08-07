import TodosView from "@/components/todos-view";
import { createTodoViewStore } from "@/hooks/todos-view-store";
import { projectQueries } from "@/lib/queries/projects";
import { todoQueries } from "@/lib/queries/todos";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/")({
  component: Index,
});

const useTodoView = createTodoViewStore("index-todo-view");

function Index() {
  const { data: todos, isLoading: todosLoading } = useQuery(
    todoQueries.listUserTodos(),
  );
  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4">
      <div className="flex-1">
        {todosLoading || projectsLoading ? (
          <div>Loading...</div>
        ) : (
          <TodosView
            todos={todos || []}
            projects={projects || []}
            useTodoView={useTodoView}
          />
        )}
      </div>
    </div>
  );
}
