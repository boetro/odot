import {
  Box,
  Calendar,
  Check,
  CirclePlus,
  Home,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import type { User } from "@/lib/types";
import { NewTodoDialog } from "./new-todo-dialog";
import { useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { NewProjectDialog } from "./new-project-dialog";
import { projectQueries } from "@/lib/queries/projects";
import { useQuery } from "@tanstack/react-query";

const mockProjects = [
  {
    id: "1",
    name: "Project 1",
    color: "#FF5733",
  },
  {
    id: "2",
    name: "Project 2",
    color: "#33FF57",
  },
];

// Menu items.
const items = [
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
];

type Props = {
  user: User;
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & Props) {
  const loc = useLocation();
  const [newTodoOpen, setNewTodoOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );

  return (
    <>
      <Sidebar variant="inset" collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <a href="/">
                  <div className="bg-primary rounded-full size-5 flex justify-center items-center">
                    <Check className="text-white dark:text-slate-800 size-5" />
                  </div>
                  <span className="font-semibold text-lg">odot</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="flex items-center gap-2">
                  <SidebarMenuButton
                    tooltip="Create Todo"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                    onClick={() => {
                      setNewTodoOpen(true);
                    }}
                  >
                    <CirclePlus />
                    <span>Create Todo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      isActive={item.url === loc.pathname}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectsLoading && (
                  <SidebarMenuItem>
                    <LoaderCircle className="animate-spin" />
                  </SidebarMenuItem>
                )}
                {projects &&
                  projects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={project.name}
                        isActive={`/projects/${project.id}` === loc.pathname}
                      >
                        <a href={`/projects/${project.id}`}>
                          <Box style={{ color: project.color }} />
                          <span>{project.name}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    variant="outline"
                    tooltip="Create Project"
                    onClick={() => setNewProjectOpen(true)}
                  >
                    <Plus />
                    <span>Create Project</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser
            user={{
              name: user.email.split("@")[0],
              email: user.email,
              avatar: user.profilePictureUrl,
            }}
          />
        </SidebarFooter>
      </Sidebar>
      <NewTodoDialog open={newTodoOpen} setOpen={setNewTodoOpen} />
      <NewProjectDialog open={newProjectOpen} setOpen={setNewProjectOpen} />
    </>
  );
}
