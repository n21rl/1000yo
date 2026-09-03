export const renderMenu = ({
  elements,
  loadStoredVampires,
  getLatestVampire,
  testVampireId,
}) => {
  const latest = getLatestVampire(loadStoredVampires(), testVampireId);
  elements.menuContinueButton.hidden = !latest;
  elements.menuContinueName.textContent = latest?.data?.name || "Unnamed Vampire";
};
