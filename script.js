const PROFILE_KEY = "caloriefit-profile-v1";
const STORAGE_KEY = "caloriefit-data-v1";

const $ = (id) => document.getElementById(id);

function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) return null;

    const profile = JSON.parse(saved);

    if (
      !profile ||
      typeof profile.name !== "string" ||
      typeof profile.email !== "string"
    ) {
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { goal: 2000, entries: [] };

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.entries) ||
      !Number.isFinite(parsed.goal) ||
      parsed.goal < 1
    ) {
      return { goal: 2000, entries: [] };
    }

    return {
      goal: Math.min(10000, parsed.goal),
      entries: parsed.entries.filter((entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.date === "string" &&
        ["food", "workout"].includes(entry.type) &&
        typeof entry.name === "string" &&
        Number.isFinite(entry.calories) &&
        entry.calories > 0
      )
    };
  } catch {
    return { goal: 2000, entries: [] };
  }
}

let profile = loadProfile();
let data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    alert("Unable to save your tracker data in this browser.");
  }
}

function showSignup() {
  $("signup-page").classList.remove("hidden");
  $("dashboard-page").classList.add("hidden");
}

function showDashboard() {
  $("signup-page").classList.add("hidden");
  $("dashboard-page").classList.remove("hidden");

  renderProfile();
  render();
}

function renderProfile() {
  if (!profile) return;

  const firstName = profile.name.trim().split(/\s+/)[0];

  $("user-name").textContent = firstName;
  $("user-avatar").textContent = firstName.charAt(0).toUpperCase();
  $("user-goal").textContent = profile.goal;
  $("user-age").textContent = `${profile.age} years`;
  $("user-height").textContent = `${profile.height} cm`;
  $("user-weight").textContent = `${profile.weight} kg`;

  $("today-date").textContent = new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function getTodayEntries(type) {
  return data.entries.filter(
    (entry) => entry.date === todayKey() && entry.type === type
  );
}

function totalCalories(type) {
  return getTodayEntries(type).reduce(
    (total, entry) => total + entry.calories,
    0
  );
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function renderList(type) {
  const isFood = type === "food";
  const list = $(isFood ? "food-list" : "workout-list");
  const count = $(isFood ? "food-count" : "workout-count");
  const entries = getTodayEntries(type);

  list.replaceChildren();

  count.textContent = `${entries.length} ${
    entries.length === 1 ? "item" : "items"
  }`;

  if (entries.length === 0) {
    list.appendChild(
      makeElement(
        "div",
        "empty-state",
        isFood
          ? "🍽️ No meals added yet. Start tracking your food!"
          : "👟 No workouts added yet. Record your first activity!"
      )
    );
    return;
  }

  entries.slice().reverse().forEach((entry) => {
    const item = makeElement("div", "activity-item");
    const icon = makeElement(
      "div",
      "activity-icon",
      isFood ? "🥗" : "🏋️"
    );

    const info = makeElement("div", "activity-info");
    info.appendChild(makeElement("strong", "", entry.name));

    info.appendChild(
      makeElement(
        "small",
        "",
        isFood ? entry.meal : `${entry.duration} minutes`
      )
    );

    const calories = makeElement(
      "span",
      "activity-calories",
      `${isFood ? "+" : "−"}${entry.calories} kcal`
    );

    const deleteButton = makeElement("button", "delete-btn", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${entry.name}`);

    deleteButton.addEventListener("click", () => {
      data.entries = data.entries.filter(
        (savedEntry) => savedEntry.id !== entry.id
      );

      saveData();
      render();
    });

    item.append(icon, info, calories, deleteButton);
    list.appendChild(item);
  });
}

function renderDashboard() {
  const consumed = totalCalories("food");
  const burned = totalCalories("workout");
  const remaining = data.goal - consumed;

  const percentage = Math.min(
    100,
    Math.round((consumed / data.goal) * 100)
  );

  $("consumed").textContent = consumed.toLocaleString("en-IN");
  $("burned").textContent = burned.toLocaleString("en-IN");
  $("remaining").textContent = remaining.toLocaleString("en-IN");
  $("goal-display").textContent = data.goal.toLocaleString("en-IN");
  $("goal-input").value = data.goal;

  $("progress-bar").style.width = `${percentage}%`;
  $("progress-text").textContent = `${percentage}% completed`;

  $("goal-status").textContent =
    consumed > data.goal
      ? `${consumed - data.goal} kcal over goal`
      : consumed === data.goal
        ? "Goal reached! 🎉"
        : "Keep going!";

  $("remaining").style.color =
    remaining < 0 ? "#db4d4d" : "#4263eb";
}

function render() {
  renderDashboard();
  renderList("food");
  renderList("workout");
}

function validNumber(value, max) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 1 || number > max) {
    return null;
  }

  return Math.round(number);
}

// SIGN-UP FORM
$("signup-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("full-name").value.trim();
  const email = $("email").value.trim();
  const age = validNumber($("age").value, 120);
  const height = validNumber($("height").value, 260);
  const weight = Number($("weight").value);
  const gender = $("gender").value;
  const goal = $("fitness-goal").value;

  const error = $("signup-error");
  error.textContent = "";

  if (
    !name ||
    !email ||
    !age ||
    age < 13 ||
    !height ||
    height < 50 ||
    !Number.isFinite(weight) ||
    weight < 10 ||
    weight > 500 ||
    !gender ||
    !goal
  ) {
    error.textContent = "Please check all your details and try again.";
    return;
  }

  profile = {
    name,
    email,
    age,
    gender,
    height,
    weight: Math.round(weight * 10) / 10,
    goal
  };

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    error.textContent =
      "Could not save your profile. Check your browser storage settings.";
    profile = null;
    return;
  }

  showDashboard();
});

// FOOD TRACKER
$("food-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("food-name").value.trim();
  const calories = validNumber($("food-calories").value, 10000);

  if (!name || !calories) {
    alert("Enter a food name and calories between 1 and 10,000.");
    return;
  }

  data.entries.push({
    id: crypto.randomUUID(),
    type: "food",
    name,
    calories,
    meal: $("meal-type").value,
    date: todayKey()
  });

  saveData();
  render();

  $("food-form").reset();
});

// WORKOUT TRACKER
$("workout-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("workout-name").value.trim();
  const calories = validNumber($("workout-calories").value, 10000);
  const duration = validNumber($("workout-duration").value, 1440);

  if (!name || !calories || !duration) {
    alert("Enter valid exercise details and positive numbers.");
    return;
  }

  data.entries.push({
    id: crypto.randomUUID(),
    type: "workout",
    name,
    calories,
    duration,
    date: todayKey()
  });

  saveData();
  render();

  $("workout-form").reset();
});

// DAILY CALORIE GOAL
$("goal-input").addEventListener("change", () => {
  const goal = validNumber($("goal-input").value, 10000);

  if (!goal) {
    alert("Set a daily goal between 1 and 10,000 kcal.");
    $("goal-input").value = data.goal;
    return;
  }

  data.goal = goal;
  saveData();
  renderDashboard();
});

// LOGOUT
$("logout-btn").addEventListener("click", () => {
  const confirmed = confirm("Would you like to log out?");

  if (!confirmed) return;

  // Keep the saved profile and tracker data.
  // The user can return by submitting their details again.
  showSignup();
});

// Restore saved form values for convenience.
function prefillProfile() {
  if (!profile) return;

  $("full-name").value = profile.name || "";
  $("email").value = profile.email || "";
  $("age").value = profile.age || "";
  $("gender").value = profile.gender || "";
  $("height").value = profile.height || "";
  $("weight").value = profile.weight || "";
  $("fitness-goal").value = profile.goal || "";
}

// On first use, show sign-up.
// If a profile already exists, open the dashboard.
if (profile) {
  showDashboard();
} else {
  showSignup();
}