export const renderMenu = ({
  elements,
  loadStoredVampires,
  loadCharacter,
  resetCreationForms,
  startPlay,
  persistStoredVampires,
  setScreen,
  render,
  getSelectedVampireId,
  setSelectedVampireId,
  testVampireId,
  createMaterialIcon,
}) => {
  const vampires = loadStoredVampires();
  elements.vampireList.innerHTML = "";
  elements.vampireList.hidden = vampires.length === 0;

  for (const vampire of vampires) {
    const item = document.createElement("li");
    item.className = "record vampire-record";
    item.tabIndex = 0;
    item.role = "button";

    const openVampire = () => {
      loadCharacter(vampire);
      resetCreationForms();
      void startPlay(true);
    };

    item.addEventListener("click", () => {
      openVampire();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openVampire();
    });

    const body = document.createElement("div");
    body.className = "vampire-option";

    const title = document.createElement("strong");
    title.textContent = vampire.data?.name || "Unnamed Vampire";
    body.append(title);

    const actions = document.createElement("div");
    actions.className = "menu-record-actions";
    if (!vampire.isPreset) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "menu-delete-control";
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const displayName = vampire.data?.name || "this vampire";
        if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) return;
        const remaining = loadStoredVampires().filter((entry) => entry.id !== vampire.id && entry.id !== testVampireId);
        persistStoredVampires(remaining);
        if (getSelectedVampireId() === vampire.id) setSelectedVampireId("");
        setScreen("menu", { updateRoute: true });
        render();
      });
      deleteButton.ariaLabel = `Delete ${vampire.data?.name || "saved vampire"}`;
      deleteButton.replaceChildren(createMaterialIcon("trash"));
      actions.append(deleteButton);
    }
    item.append(body, actions);
    elements.vampireList.append(item);
  }
};
