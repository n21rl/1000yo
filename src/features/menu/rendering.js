export const renderMenu = ({
  elements,
  loadStoredVampires,
  getLatestCompleteVampire,
  testVampireId,
}) => {
  const latest = getLatestCompleteVampire(loadStoredVampires(), testVampireId);
  elements.menuContinueButton.hidden = !latest;
  elements.menuContinueName.textContent = latest?.data?.name || "Unnamed Vampire";
};
