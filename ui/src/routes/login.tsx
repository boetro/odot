import { LoginForm } from "@/components/login-form";
import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary rounded-full size-6 flex justify-center items-center">
            <Check className="text-white dark:text-slate-800 size-5" />
          </div>
          odot
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
