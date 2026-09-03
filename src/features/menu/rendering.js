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
  createIcon,
  openConfirmDialog,
}) => {
  const vampires = loadStoredVampires();
  elements.vampireList.innerHTML = "";
  elements.vampireList.hidden = vampires.length === 0;

  for (const vampire of vampires) {
    const displayName = vampire.data?.name || "Unnamed Vampire";

    const item = document.createElement("li");
    item.className = "menu-vampire-item";

    const row = document.createElement("button");
    row.type = "button";
    row.className = "menu-vampire-row";

    const openVampire = () => {
      loadCharacter(vampire);
      resetCreationForms();
      void startPlay(true);
    };
    row.addEventListener("click", openVampire);

    const icon = document.createElement("span");
    icon.className = "menu-vampire-icon";
    icon.append(createIcon("person"));

    const info = document.createElement("span");
    info.className = "menu-vampire-info";
    const name = document.createElement("span");
    name.className = "menu-vampire-name";
    name.textContent = displayName;
    info.append(name);

    const chevron = document.createElement("span");
    chevron.className = "menu-vampire-chevron";
    chevron.append(createIcon("chevron_right"));

    row.append(icon, info, chevron);
    item.append(row);

    if (!vampire.isPreset) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "menu-vampire-delete";
      deleteButton.ariaLabel = `Delete ${displayName}`;
      deleteButton.append(createIcon("delete"));
      deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        const confirmed = await openConfirmDialog({
          title: "Delete save?",
          body: `Delete ${displayName}? This cannot be undone.`,
          confirmLabel: "Delete",
          danger: true,
        });
        if (!confirmed) return;
        const remaining = loadStoredVampires().filter((entry) => entry.id !== vampire.id && entry.id !== testVampireId);
        persistStoredVampires(remaining);
        if (getSelectedVampireId() === vampire.id) setSelectedVampireId("");
        setScreen("menu", { updateRoute: true });
        render();
      });
      item.append(deleteButton);
    }

    elements.vampireList.append(item);
  }
};
