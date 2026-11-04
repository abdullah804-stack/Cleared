import { TabPage, ToolRow } from "../../components/TabPage";
import { TRACK_TOOLS } from "../../constants/tools";

export default function TrackTab() {
  return (
    <TabPage title="Track & learn" subtitle="See your progress and know what's fair." icon="pulse" tint="#2DD4BF">
      {TRACK_TOOLS.map((t, i) => (
        <ToolRow key={t.path} tool={t} index={i} />
      ))}
    </TabPage>
  );
}