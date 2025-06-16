import Layout from "@/components/layout";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const state = await context.auth.checkAuth();
    if (!state.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
