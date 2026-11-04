// app/(tabs)/_layout.tsx
// The five main sections. Home sits in the middle.
import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
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