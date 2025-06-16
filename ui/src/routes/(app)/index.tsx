import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2" id="root">
      <h3>Welcome Home!</h3>
    </div>
  );
}
