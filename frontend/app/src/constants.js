// constants.js
// Shared across quiz frontend components

export const API_GATEWAY = "http://localhost:8000";

export const CATEGORY_LABELS = {
  food_and_drink: "Food & Drink",
  activity_preferences: "Activity Preferences",
  ambience_and_vibe: "Ambience & Vibe",
  visit_style_and_occasion: "Visit Style & Occasion",
};

export function getOrCreateUserId() {
  let id = localStorage.getItem("quiz_user_id");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("quiz_user_id", id);
  }
  return "user-" + id;
}
