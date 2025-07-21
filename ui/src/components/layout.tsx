import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuthRequired } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/lib/queries/projects";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

import { Box } from "lucide-react";
import { todoQueries } from "@/lib/queries/todos";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthRequired();
  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );
  const location = useLocation();

  const selectedTodoId = (() => {
    if (location.pathname.startsWith("/todos")) {
      const todoId = location.pathname.split("/")[2];
      if (todoId) {
        const numericTodoId = Number(todoId);
        if (!isNaN(numericTodoId)) {
          return numericTodoId;
        }
      }
    }
    return null;
  })();

  const { data: selectedTodo, isLoading: selectedTodoLoading } = useQuery(
    todoQueries.getTodo(selectedTodoId),
  );

  const selectedProject = (() => {
    if (
      location.pathname.startsWith("/projects") &&
      projects !== undefined &&
      !projectsLoading
    ) {
      const projectId = location.pathname.split("/")[2];
      if (projectId) {
        const numericProjectId = Number(projectId);
        if (!isNaN(numericProjectId)) {
          return projects?.find((project) => project.id === numericProjectId);
        }
      }
    } else if (selectedTodo && selectedTodo.project_id) {
      return projects?.find(
        (project) => project.id === selectedTodo.project_id,
      );
    }
    return null;
  })();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="border h-full-w-full overflow-hidden">
        <div className="pl-1 py-1 border-b flex space-x-2 items-center">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              {location.pathname === "/" && (
                <BreadcrumbItem>
                  <BreadcrumbPage>Home</BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {location.pathname.startsWith("/projects") && selectedProject && (
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex gap-2 items-center">
                    <Box
                      className="size-4"
                      style={{ color: selectedProject.color }}
                    />
                    {selectedProject.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {location.pathname.startsWith("/todos") &&
                selectedTodo &&
                !selectedTodoLoading && (
                  <>
                    {selectedProject && (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link
                              className="flex gap-2 items-center truncate"
                              to="/projects/$projectId"
                              params={{
                                projectId: selectedProject.id.toString(),
                              }}
                            >
                              <Box
                                className="size-4"
                                style={{ color: selectedProject.color }}
                              />
                              {selectedProject.name}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                      </>
                    )}
                    <BreadcrumbItem>
                      <BreadcrumbPage className="truncate">
                        {selectedTodo.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="w-full h-[calc(100vh-55px)] overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
