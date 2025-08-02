import TodosView from "@/components/todos-view";
import { createTodoViewStore } from "@/hooks/todos-view-store";
import { projectQueries } from "@/lib/queries/projects";
import { todoQueries } from "@/lib/queries/todos";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/projects/$projectId")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.prefetchQuery(
      todoQueries.listProjectTodos(parseInt(params.projectId)),
    );
  },
});

function RouteComponent() {
  const { projectId } = Route.useParams();

  const useTodoView = createTodoViewStore(`project-${projectId}-todo-view`);

  const { data: todos, isLoading: todosLoading } = useQuery(
    todoQueries.listProjectTodos(parseInt(projectId)),
  );
  // TODO: we don't need to list all projects just need to fetch
  // the current one
  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );

  return (
    <div className="h-full w-full">
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
  );
}
