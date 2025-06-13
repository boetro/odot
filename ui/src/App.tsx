import "./App.css";
import "@mantine/core/styles.css";
import {
  createTheme,
  MantineProvider,
  type MantineColorsTuple,
  AppShell,
  Burger,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

const myColor: MantineColorsTuple = [
  "#f7ecff",
  "#e7d6fb",
  "#caaaf1",
  "#ac7ce8",
  "#9354e0",
  "#833bdb",
  "#7b2eda",
  "#6921c2",
  "#5d1cae",
  "#501599",
];

const theme = createTheme({
  colors: {
    myColor,
  },
});

function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header className="flex space-x-2 items-center px-4">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <div>odot</div>
        </AppShell.Header>

        <AppShell.Navbar p="md">Navbar</AppShell.Navbar>

        <AppShell.Main>Main ASDF</AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
