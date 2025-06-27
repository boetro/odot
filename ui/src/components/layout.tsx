import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuthRequired } from "@/hooks/use-auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthRequired();
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="border">
        <main>
          {/* <SidebarTrigger /> */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
