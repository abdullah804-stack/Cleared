// app/appointment.tsx
import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { colors } from "../constants/theme";

export default function AppointmentScreen() {
  return (
    <Screen style={styles.center}>
      <Text style={styles.text}>Appointment Booked (Placeholder)</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, color: colors.text },
});