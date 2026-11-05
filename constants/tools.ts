// constants/tools.ts
// Every tool in the app, grouped by the tab it lives in. Add, remove or reorder tiles here.
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;
export type Tool = { title: string; sub: string; icon: IconName; tint: string; path: string };

export const CARE_TOOLS: Tool[] = [
  { title: "Daily Routine", sub: "Brush, floss, keep your streak", icon: "flame", tint: "#F59E0B", path: "/routine" },
  { title: "My Visits", sub: "Upcoming and past appointments", icon: "calendar", tint: "#22D3EE", path: "/appointments" },
  { title: "Recovery Plan", sub: "Day-by-day after treatment", icon: "heart", tint: "#FB7185", path: "/recovery" },
  { title: "Visit Notes", sub: "What your dentist said", icon: "document-text", tint: "#818CF8", path: "/visit-notes" },
];

export const TRACK_TOOLS: Tool[] = [
  { title: "Pain Journal", sub: "Spot patterns over 7 days", icon: "analytics", tint: "#2DD4BF", path: "/journal" },
  { title: "Photo Timeline", sub: "Private, stays on your phone", icon: "camera", tint: "#A78BFA", path: "/photos" },
  { title: "Cost Estimator", sub: "Typical prices in rupees", icon: "calculator", tint: "#22D3EE", path: "/estimator" },
  { title: "Community Prices", sub: "What others paid", icon: "people", tint: "#FBBF24", path: "/community-prices" },
];

export const HELP_TOOLS: Tool[] = [
  { title: "Ask Cleared", sub: "Questions about your care", icon: "chatbubbles", tint: "#22D3EE", path: "/chat" },
  { title: "Case Card", sub: "Share your case with a clinic", icon: "id-card", tint: "#2DD4BF", path: "/case-card" },
  { title: "Dental Profile", sub: "Allergies, medicines, history", icon: "medkit", tint: "#818CF8", path: "/dental-profile" },
  { title: "Find a Dentist", sub: "Describe it and get a plan", icon: "search", tint: "#F472B6", path: "/triage" },
];

export const MORE_TOOLS: Tool[] = [
  { title: "Kids Brushing", sub: "A fun 2-minute timer", icon: "happy", tint: "#2DD4BF", path: "/kids-timer" },
  { title: "Ramadan Mode", sub: "Reminders for suhoor and iftar", icon: "moon", tint: "#818CF8", path: "/ramadan" },
  { title: "Audit Log", sub: "Everything the AI did", icon: "shield-checkmark", tint: "#94A3B8", path: "/audit" },
  { title: "Settings", sub: "Profile, avatar, privacy", icon: "settings", tint: "#22D3EE", path: "/settings" },
];

export const QUICK_ACTIONS: Tool[] = [
  { title: "First aid", sub: "", icon: "medkit", tint: "#FB7185", path: "/emergency-aid" },
  { title: "Visits", sub: "", icon: "calendar", tint: "#22D3EE", path: "/appointments" },
  { title: "Routine", sub: "", icon: "flame", tint: "#F59E0B", path: "/routine" },
  { title: "Journal", sub: "", icon: "analytics", tint: "#2DD4BF", path: "/journal" },
  { title: "Prices", sub: "", icon: "cash", tint: "#FBBF24", path: "/community-prices" },
];

/** Real, public YouTube videos (opened in the YouTube app). Replace or add ids freely. */
export const VIDEOS = [
  { id: "Z_7bBppIINc", title: "How to Brush Your Teeth Properly", channel: "Evanston Dental Associates", tag: "Brushing" },
  { id: "_3DlqETJHcQ", title: "How To Properly Floss Your Teeth", channel: "Teeth Talk Girl", tag: "Flossing" },
  { id: "vPPAvskKkqo", title: "Toothache? Do this BEFORE seeing the dentist", channel: "Dr. Nathan Coughlin", tag: "Toothache" },
  { id: "A0eco4ipMSM", title: "Root Canal Treatment Explained in 3D", channel: "HumanBody Lab", tag: "Treatment" },
  { id: "GZDTacr6BSQ", title: "A Dental Hygienist Teaches You To Floss", channel: "Teeth Talk Girl", tag: "Flossing" },
];

export const TIPS = [
  { icon: "brush" as IconName, tint: "#22D3EE", title: "Two minutes, twice a day", text: "Brush with a fluoride toothpaste and a soft brush. Small gentle circles, every surface, morning and night." },
  { icon: "water" as IconName, tint: "#60A5FA", title: "Spit, don't rinse", text: "After brushing, spit out the foam but skip the water. The fluoride left behind keeps protecting your enamel." },
  { icon: "git-compare" as IconName, tint: "#2DD4BF", title: "Floss once a day", text: "Floss reaches the 35% of tooth surface your brush can't. Gums may bleed for the first week, then calm down." },
  { icon: "cafe" as IconName, tint: "#FBBF24", title: "How often matters more than how much", text: "Sipping sweet chai all day does more harm than a dessert with a meal. Keep sugar to mealtimes." },
  { icon: "refresh" as IconName, tint: "#A78BFA", title: "Change your brush", text: "Replace your toothbrush every 3 months, or sooner when the bristles splay out." },
  { icon: "ban" as IconName, tint: "#FB7185", title: "Never put aspirin on a gum", text: "An old myth. It burns the gum tissue and does not stop the pain. See a dentist instead." },
  { icon: "alert-circle" as IconName, tint: "#F97316", title: "Don't wait on swelling", text: "Pain that wakes you at night, a swollen face or a fever needs a dentist the same day." },
  { icon: "calendar" as IconName, tint: "#34D399", title: "Check-up every six months", text: "Cavities are cheap and painless to fix when small. A regular check catches them early." },
];

/** Short one-liners for the drifting advice strip on Home. */
export const ADVICE = [
  { icon: "time" as IconName, tint: "#22D3EE", text: "Don't brush right after acidic drinks. Wait 30 minutes so enamel can harden again." },
  { icon: "color-fill" as IconName, tint: "#2DD4BF", text: "A pea-sized dab of fluoride toothpaste is enough for adults. Use a rice-grain for toddlers." },
  { icon: "alert-circle" as IconName, tint: "#FB7185", text: "Bleeding gums usually mean plaque. Brush gently, floss daily, and see a dentist if it lasts." },
  { icon: "snow" as IconName, tint: "#60A5FA", text: "Don't chew ice or open bottles with your teeth. Cracked enamel can't heal." },
  { icon: "happy" as IconName, tint: "#A78BFA", text: "Clean your tongue too. Most bad breath starts there, not on the teeth." },
  { icon: "cafe" as IconName, tint: "#FBBF24", text: "Sugary chai is fine with meals. Sipping it all day is what causes cavities." },
  { icon: "flash" as IconName, tint: "#F97316", text: "A knocked-out adult tooth can often be saved if you reach a dentist within 30 minutes." },
  { icon: "people" as IconName, tint: "#34D399", text: "Start brushing your child's teeth the moment the first tooth appears." },
  { icon: "warning" as IconName, tint: "#FB7185", text: "Wisdom tooth pain with swelling and a bad taste is often infection. Don't wait." },
  { icon: "water" as IconName, tint: "#22D3EE", text: "Mouthwash helps, but it never replaces brushing and flossing." },
  { icon: "thermometer" as IconName, tint: "#FBBF24", text: "Sensitive teeth? Try desensitising toothpaste and a soft brush. If it lasts weeks, get it checked." },
  { icon: "ban" as IconName, tint: "#F97316", text: "Paan, gutka and smoking stain teeth and raise the risk of gum disease and mouth cancer." },
];