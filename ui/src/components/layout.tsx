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

import { Box, Plus } from "lucide-react";
import { todoQueries } from "@/lib/queries/todos";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { pushNotificationService } from "../lib/push-notifications";
import { Button } from "./ui/button";
import { NewTodoDialog } from "./new-todo-dialog";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthRequired();
  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );
  const location = useLocation();
  const [isNotificationInitialized, setIsNotificationInitialized] =
    useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [newTodoOpen, setNewTodoOpen] = useState(false);

  const initializePushNotifications = async () => {
    setIsSupported(pushNotificationService.supported);

    if (pushNotificationService.supported) {
      setPermission(Notification.permission);

      const success = await pushNotificationService.initialize();
      if (success) {
        const subscription = await pushNotificationService.getSubscription();
        setIsSubscribed(!!subscription);
      }
    }
    setIsNotificationInitialized(true);
  };

  const handleSubscribe = useCallback(async () => {
    if (!user || !pushNotificationService.supported) return;

    setIsSubscriptionLoading(true);

    try {
      if (permission !== "granted") {
        const newPermission = await pushNotificationService.requestPermission();
        setPermission(newPermission);
        if (newPermission !== "granted") {
          return;
        }
      }

      const subscription = await pushNotificationService.subscribe();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Failed to subscribe:", error);
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [user, permission]);

  useEffect(() => {
    initializePushNotifications();
  }, []);

  useEffect(() => {
    if (
      isNotificationInitialized &&
      isSupported &&
      permission !== "denied" &&
      !isSubscriptionLoading
    ) {
      if (!isSubscribed) {
        toast("Enable notifications for upcoming todos", {
          action: { label: "Allow", onClick: () => handleSubscribe() },
        });
      }
    }
  }, [
    isSubscribed,
    isSupported,
    isNotificationInitialized,
    handleSubscribe,
    permission,
    isSubscriptionLoading,
  ]);

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
        <div className="flex justify-between border-b">
          <div className="pl-1 py-1 flex space-x-2 items-center">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                {location.pathname === "/" && (
                  <BreadcrumbItem>
                    <BreadcrumbPage>Home</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
                {location.pathname.startsWith("/projects") &&
                  selectedProject && (
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
          <Button
            size="icon"
            className="flex md:hidden p-0 m-3 size-6"
            onClick={() => setNewTodoOpen(true)}
          >
            <Plus />
          </Button>
        </div>
        <div className="w-full h-[calc(100vh-55px)] overflow-hidden">
          {children}
        </div>
      </SidebarInset>
      <NewTodoDialog
        open={newTodoOpen}
        setOpen={setNewTodoOpen}
        projects={projects || []}
      />
    </SidebarProvider>
  );
}
