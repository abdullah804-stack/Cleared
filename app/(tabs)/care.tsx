export { ErrorBoundary } from "expo-router";
import { TabPage, ToolRow } from "../../components/TabPage";
import { CARE_TOOLS } from "../../constants/tools";

export default function CareTab() {
  return (
    <TabPage title="Your care" subtitle="Routines, visits and recovery in one place." icon="heart" tint="#FB7185">
      {CARE_TOOLS.map((t, i) => (
        <ToolRow key={t.path} tool={t} index={i} />
      ))}
    </TabPage>
  );
}