import Layout from "./components/layout";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Layout>
        <div>todo</div>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
