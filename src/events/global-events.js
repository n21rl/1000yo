export const bindModalCloseEvents = (onClose) => {
  document.querySelectorAll("[data-modal-close]").forEach((target) => {
    target.addEventListener("click", () => {
      onClose();
    });
  });
};

export const bindEscapeKeyHandler = (isModalOpen, onClose) => {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isModalOpen()) return;
    onClose();
  });
};

export const bindCardToggleEvents = (onToggleCard) => {
  document.querySelectorAll("[data-card-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      const interactive = event.target.closest("button, input, textarea, select, label");
      const chevronButton = event.target.closest("[data-card-chevron]");
      if (interactive && !chevronButton) return;
      const card = toggle.closest("[data-card-key]");
      const key = card?.dataset.cardKey;
      if (!key) return;
      onToggleCard(key);
    });
  });
};

export const bindHashChange = (onHashChange) => {
  window.addEventListener("hashchange", () => {
    onHashChange();
  });
};
