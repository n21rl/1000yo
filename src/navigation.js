export const SCREEN_TITLES = {
  menu: "Start Menu",
  creation: "Vampire Creation",
  play: "Play",
  saves: "Saves",
};

export const getRouteForScreen = (screen, selectedVampireId = "") => {
  if (screen === "creation") return "#/create";
  if (screen === "play" && selectedVampireId) return `#/play/${selectedVampireId}`;
  if (screen === "saves") return "#/saves";
  return "#/menu";
};

export const updateDocumentTitle = (screen, doc = document) => {
  const title = SCREEN_TITLES[screen] ?? "1000yo";
  doc.title = `${title} · 1000yo`;
};

export const applyScreenVisibility = (screen, elements) => {
  elements.menuScreen.hidden = screen !== "menu";
  elements.creationScreen.hidden = screen !== "creation";
  elements.playScreen.hidden = screen !== "play";
  elements.savesScreen.hidden = screen !== "saves";
};
