export const handleRouteChange = async ({
  parseRouteHash,
  getHash,
  setScreen,
  render,
  getSelectedVampireId,
  startNewVampire,
  loadStoredVampires,
  loadCharacter,
  resetCreationForms,
  startPlay,
}) => {
  const { screen, vampireId } = parseRouteHash(getHash());
  if (screen === "menu") {
    setScreen("menu");
    render();
    return;
  }
  if (screen === "creation") {
    if (!getSelectedVampireId()) {
      startNewVampire();
      return;
    }
    setScreen("creation");
    render();
    return;
  }
  if (!vampireId) {
    setScreen("menu", { updateRoute: true, replaceRoute: true });
    render();
    return;
  }
  const storedCharacter = loadStoredVampires().find((entry) => entry.id === vampireId);
  if (!storedCharacter) {
    setScreen("menu", { updateRoute: true, replaceRoute: true });
    render();
    return;
  }
  loadCharacter(storedCharacter);
  resetCreationForms();
  await startPlay(true);
};
