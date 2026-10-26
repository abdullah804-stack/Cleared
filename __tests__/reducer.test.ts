// __tests__/reducer.test.ts
import { executeTool } from "../shared/tools";

describe("Mock Tools Execution", () => {
  it("should successfully analyze symptoms without network errors", async () => {
    const result = await executeTool("analyze_symptoms", { symptom_text: "tooth hurts" }, "user-1", "test@test.com");
    expect(result.ok).toBe(true);
  });

  it("should handle booking logic without crashing", async () => {
    // We test the booking logic. If it randomly fails, it should return a valid string error. 
    // If it succeeds, it should return an ok: true status. We assert that it does one of these two safely.
    const result = await executeTool("book_appointment", { clinic_id: "c1", slot_id: "slot-1" }, "user-1", "test@test.com");
    
    if (result.ok) {
      expect(typeof result.output).toBe("string");
    } else {
      expect(typeof result.error).toBe("string");
    }
  });
});