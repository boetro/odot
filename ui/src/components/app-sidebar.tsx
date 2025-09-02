import {
  Box,
  ChevronRight,
  CirclePlus,
  Edit,
  Ellipsis,
  Home,
  LoaderCircle,
  Plus,
  SearchIcon,
  Trash,
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import type { Project, User } from "@/lib/types";
import { NewTodoDialog } from "./new-todo-dialog";
import { Link, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ProjectDialog } from "./project-dialog";
import { projectQueries } from "@/lib/queries/projects";
import { useQuery } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import SearchDialog from "./search";
import { todoQueries } from "@/lib/queries/todos";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
];

type Props = {
  user: User;
  selectedProject: Project | null | undefined;
};

type ProjectHierarchy = {
  project: Project;
  children: ProjectHierarchy[];
};

export function AppSidebar({
  user,
  selectedProject,
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

  const { data: todos } = useQuery(todoQueries.listUserTodos());

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

  const [searchOpen, setSearchOpen] = useState(false);

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
                <Link to="/" className="flex items-center gap-3">
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="size-4 mt-[2.5px]"
                  />
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Search"
                    onClick={() => {
                      setSearchOpen(true);
                    }}
                  >
                    <SearchIcon />
                    Search
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
                    allProjects={projects || []}
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
        <SidebarRail />
      </Sidebar>
      {projects !== undefined && (
        <NewTodoDialog
          open={newTodoOpen}
          setOpen={setNewTodoOpen}
          projects={projects || []}
          initialProject={selectedProject}
        />
      )}
      {projects !== undefined && (
        <ProjectDialog
          open={newProjectOpen}
          setOpen={setNewProjectOpen}
          projects={projects || []}
        />
      )}
      <SearchDialog
        open={searchOpen}
        setOpen={setSearchOpen}
        projects={projects || []}
        todos={todos || []}
      />
    </>
  );
}

function ProjectTree({
  projectHierarchy,
  allProjects,
}: {
  projectHierarchy: ProjectHierarchy;
  allProjects: Project[];
}) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [updateProjectOpen, setUpdateProjectOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Helper function to check if current project contains the active project in its hierarchy
  const containsActiveProject = useCallback(
    (hierarchy: ProjectHierarchy, targetPath: string): boolean => {
      const targetProjectId = targetPath.match(/\/projects\/(\d+)/)?.[1];
      if (!targetProjectId) return false;

      // Check if this project is the target
      if (hierarchy.project.id.toString() === targetProjectId) {
        return true;
      }

      // Check if any child contains the target
      return hierarchy.children.some((child) =>
        containsActiveProject(child, targetPath),
      );
    },
    [],
  );

  useEffect(() => {
    const isCurrentProject =
      `/projects/${projectHierarchy.project.id}` === loc.pathname;
    const containsActive = containsActiveProject(
      projectHierarchy,
      loc.pathname,
    );

    if (isCurrentProject || containsActive) {
      setOpen(true);
    }
  }, [loc.pathname, projectHierarchy, containsActiveProject]);

  if (!projectHierarchy.children.length) {
    return (
      <SidebarMenuButton
        tooltip={projectHierarchy.project.name}
        isActive={`/projects/${projectHierarchy.project.id}` === loc.pathname}
        className="flex justify-between p-0 px-2 group"
      >
        <Link
          to="/projects/$projectId"
          params={{ projectId: projectHierarchy.project.id.toString() }}
          className="flex items-center gap-2 w-full"
        >
          <Box
            style={{ color: projectHierarchy.project.color }}
            className="size-4"
          />
          <span className="w-full flex">{projectHierarchy.project.name}</span>
        </Link>
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`dark:hover:bg-background/30 size-6 transition-opacity ${
                updateProjectOpen || dropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="text-xs">
            <DropdownMenuItem onClick={() => setUpdateProjectOpen(true)}>
              <Edit />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ProjectDialog
          projects={allProjects}
          open={updateProjectOpen}
          setOpen={setUpdateProjectOpen}
          initialProject={projectHierarchy.project}
        />
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
            className="flex justify-between flex-row-reverse p-0 px-2 group"
          >
            <ChevronRight className="transition-transform" />
            <DropdownMenu onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`dark:hover:bg-background/30 size-6 transition-opacity ${
                    updateProjectOpen || dropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="text-xs">
                <DropdownMenuItem onClick={() => setUpdateProjectOpen(true)}>
                  <Edit />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <ProjectTree
                key={index}
                projectHierarchy={subItem}
                allProjects={allProjects}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
      <ProjectDialog
        projects={allProjects}
        open={updateProjectOpen}
        setOpen={setUpdateProjectOpen}
        initialProject={projectHierarchy.project}
      />
    </SidebarMenuItem>
  );
}
