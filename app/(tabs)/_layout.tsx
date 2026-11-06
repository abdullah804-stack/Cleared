export { ErrorBoundary } from "expo-router";
// app/(tabs)/_layout.tsx
// The five main sections. Home sits in the middle.
import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <TabBar
          {...props}
          navigation={{
            navigate: (routeName: string) => {
              const route = props.state.routes.find((item) => item.name === routeName);
              if (route) props.navigateToTab(route.key);
            },
          } as React.ComponentProps<typeof TabBar>["navigation"]}
        />
      )}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#000000" } }}
    >
      <Tabs.Screen name="care" options={{ title: "Care" }} />
      <Tabs.Screen name="track" options={{ title: "Track" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="help" options={{ title: "Help" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}