import {
  Box,
  Calendar,
  Check,
  ChevronRight,
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
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import type { Project, User } from "@/lib/types";
import { NewTodoDialog } from "./new-todo-dialog";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NewProjectDialog } from "./new-project-dialog";
import { projectQueries } from "@/lib/queries/projects";
import { useQuery } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

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

type ProjectHierarchy = {
  project: Project;
  children: ProjectHierarchy[];
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & Props) {
  const loc = useLocation();
  const [newTodoOpen, setNewTodoOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectHierarchy, setProjectHierarchy] = useState<ProjectHierarchy[]>(
    [],
  );

  const { data: projects, isLoading: projectsLoading } = useQuery(
    projectQueries.listProjects(),
  );

  useEffect(() => {
    if (projects) {
      // Create a map for quick lookup
      const projectMap = new Map<number, Project>();
      projects.forEach((project) => {
        projectMap.set(project.id, project);
      });

      // Build hierarchy
      const buildHierarchy = (parentId: number | null): ProjectHierarchy[] => {
        return projects
          .filter((project) => project.parent_project_id === parentId)
          .map((project) => ({
            project,
            children: buildHierarchy(project.id),
          }));
      };

      // Get root projects (those with no parent)
      const hierarchy = buildHierarchy(null);
      setProjectHierarchy(hierarchy);
    }
  }, [projects]);

  return (
    <>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <Link to="/">
                  <div className="bg-primary rounded-full size-5 flex justify-center items-center">
                    <Check className="text-white dark:text-slate-800 size-5" />
                  </div>
                  <span className="font-semibold text-lg">odot</span>
                </Link>
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
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
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
                {projectHierarchy.map((project) => (
                  <ProjectTree
                    key={project.project.id}
                    projectHierarchy={project}
                  />
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
      {projects !== undefined && (
        <NewProjectDialog
          open={newProjectOpen}
          setOpen={setNewProjectOpen}
          projects={projects || []}
        />
      )}
    </>
  );
}

function ProjectTree({
  projectHierarchy,
}: {
  projectHierarchy: ProjectHierarchy;
}) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (`/projects/${projectHierarchy.project.id}` === loc.pathname) {
      setOpen(true);
    }
  }, [loc.pathname, projectHierarchy.project.id]);

  if (!projectHierarchy.children.length) {
    return (
      <SidebarMenuButton
        asChild
        tooltip={projectHierarchy.project.name}
        isActive={`/projects/${projectHierarchy.project.id}` === loc.pathname}
      >
        <Link
          to="/projects/$projectId"
          params={{ projectId: projectHierarchy.project.id.toString() }}
          className="flex items-center gap-2"
        >
          <Box
            style={{ color: projectHierarchy.project.color }}
            className="size-4"
          />
          <span>{projectHierarchy.project.name}</span>
        </Link>
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuItem className="mx-0 px-0">
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={projectHierarchy.project.name}
            isActive={
              `/projects/${projectHierarchy.project.id}` === loc.pathname
            }
            className="flex justify-between flex-row-reverse p-0 px-2"
          >
            <ChevronRight className="transition-transform" />
            <span className="flex justify-between items-center gap-2 w-full h-full">
              <Link
                to="/projects/$projectId"
                params={{ projectId: projectHierarchy.project.id.toString() }}
                className="flex items-center gap-2 w-full h-full"
              >
                <Box
                  style={{ color: projectHierarchy.project.color }}
                  className="size-4"
                />
                <span>{projectHierarchy.project.name}</span>
              </Link>
            </span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            {projectHierarchy.children.map((subItem, index) => (
              <ProjectTree key={index} projectHierarchy={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
