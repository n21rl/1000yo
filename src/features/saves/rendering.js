export const renderSaves = ({
  elements,
  loadStoredVampires,
  persistStoredVampires,
  openVampireEntry,
  renameVampire,
  render,
  getSelectedVampireId,
  setSelectedVampireId,
  testVampireId,
  createIcon,
  openConfirmDialog,
  openActionSheet,
  openPromptDialog,
}) => {
  const vampires = loadStoredVampires();
  elements.savesVampireList.innerHTML = "";
  elements.savesVampireList.hidden = vampires.length === 0;

  for (const vampire of vampires) {
    const displayName = vampire.data?.name || "Unnamed Vampire";
    const isPreset = vampire.id === testVampireId;

    const item = document.createElement("li");
    item.className = "menu-vampire-item";

    const row = document.createElement("button");
    row.type = "button";
    row.className = "menu-vampire-row";
    row.addEventListener("click", () => openVampireEntry(vampire));

    const icon = document.createElement("span");
    icon.className = "menu-vampire-icon";
    icon.append(createIcon("person"));

    const info = document.createElement("span");
    info.className = "menu-vampire-info";
    const name = document.createElement("span");
    name.className = "menu-vampire-name";
    name.textContent = displayName;
    info.append(name);
    if (!vampire.isComplete) {
      const status = document.createElement("span");
      status.className = "menu-vampire-status";
      status.textContent = "Unfinished";
      info.append(status);
    }

    const chevron = document.createElement("span");
    chevron.className = "menu-vampire-chevron";
    chevron.append(createIcon("chevron_right"));

    row.append(icon, info, chevron);
    item.append(row);

    if (!isPreset) {
      const moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.className = "menu-vampire-more";
      moreButton.setAttribute("aria-label", `${displayName} options`);
      moreButton.append(createIcon("more_vert"));
      moreButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        const choice = await openActionSheet({
          title: displayName,
          actions: [
            { id: "rename", label: "Rename" },
            { id: "delete", label: "Delete", danger: true },
          ],
        });

        if (choice === "rename") {
          const nextName = await openPromptDialog({ title: "Rename vampire", label: "Name", initialValue: displayName });
          if (nextName === null) return;
          if (!renameVampire(vampire.id, nextName)) return;
          render();
          return;
        }
        if (choice === "delete") {
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
          render();
        }
      });
      item.append(moreButton);
    }

    elements.savesVampireList.append(item);
  }
};
