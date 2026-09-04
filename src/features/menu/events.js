export const bindMenuEvents = ({
  elements,
  startNewVampireFlow,
  openVampireEntry,
  loadStoredVampires,
  getLatestCompleteVampire,
  testVampireId,
  setScreen,
  render,
}) => {
  elements.newVampireButton.addEventListener("click", () => {
    void startNewVampireFlow();
  });

  elements.menuContinueButton.addEventListener("click", () => {
    const latest = getLatestCompleteVampire(loadStoredVampires(), testVampireId);
    if (!latest) return;
    openVampireEntry(latest);
  });

  elements.menuSavesButton.addEventListener("click", () => {
    setScreen("saves", { updateRoute: true });
    render();
  });

  elements.savesBackButton.addEventListener("click", () => {
    setScreen("menu", { updateRoute: true });
    render();
  });
};
