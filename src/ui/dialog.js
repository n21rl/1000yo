const DIALOG_ROOT_ID = "app-dialog-root";

const getDialogRoot = () => document.getElementById(DIALOG_ROOT_ID);

const mountDialog = ({ render, cancelValue }) =>
  new Promise((resolve) => {
    const root = getDialogRoot();
    if (!root) {
      resolve(cancelValue);
      return;
    }

    const finish = (value) => {
      document.removeEventListener("keydown", onKeydown);
      root.hidden = true;
      root.replaceChildren();
      resolve(value);
    };

    const onKeydown = (event) => {
      if (event.key === "Escape") finish(cancelValue);
    };

    const backdrop = document.createElement("div");
    backdrop.className = "app-dialog-backdrop";
    backdrop.addEventListener("click", () => finish(cancelValue));

    const card = document.createElement("div");
    card.className = "app-dialog";
    card.setAttribute("role", "alertdialog");
    card.setAttribute("aria-modal", "true");

    const focusTarget = render(card, finish);

    document.addEventListener("keydown", onKeydown);
    root.replaceChildren(backdrop, card);
    root.hidden = false;
    focusTarget?.focus();
  });

const appendHeading = (card, title) => {
  if (!title) return;
  const heading = document.createElement("h3");
  heading.className = "app-dialog-title";
  heading.textContent = title;
  card.append(heading);
};

export const openConfirmDialog = ({
  title = "",
  body = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
} = {}) =>
  mountDialog({
    cancelValue: false,
    render: (card, finish) => {
      if (danger) card.classList.add("app-dialog-danger");
      appendHeading(card, title);

      if (body) {
        const bodyEl = document.createElement("p");
        bodyEl.className = "app-dialog-body";
        bodyEl.textContent = body;
        card.append(bodyEl);
      }

      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "app-dialog-cancel";
      cancelButton.textContent = cancelLabel;
      cancelButton.addEventListener("click", () => finish(false));

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = danger ? "app-dialog-confirm app-dialog-confirm-danger" : "app-dialog-confirm";
      confirmButton.textContent = confirmLabel;
      confirmButton.addEventListener("click", () => finish(true));

      actions.append(cancelButton, confirmButton);
      card.append(actions);
      return confirmButton;
    },
  });

export const openAlertDialog = ({ title = "", body = "" } = {}) =>
  mountDialog({
    cancelValue: undefined,
    render: (card, finish) => {
      appendHeading(card, title);
      if (body) {
        const bodyEl = document.createElement("p");
        bodyEl.className = "app-dialog-body";
        bodyEl.textContent = body;
        card.append(bodyEl);
      }
      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";
      const okButton = document.createElement("button");
      okButton.type = "button";
      okButton.className = "app-dialog-confirm";
      okButton.textContent = "OK";
      okButton.addEventListener("click", () => finish(undefined));
      actions.append(okButton);
      card.append(actions);
      return okButton;
    },
  });

export const openActionSheet = ({ title = "", actions = [] } = {}) =>
  mountDialog({
    cancelValue: null,
    render: (card, finish) => {
      card.classList.add("app-action-sheet");
      appendHeading(card, title);

      const list = document.createElement("div");
      list.className = "app-action-sheet-list";
      let firstButton = null;
      actions.forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.danger ? "app-action-sheet-item app-action-sheet-item-danger" : "app-action-sheet-item";
        button.textContent = action.label;
        button.addEventListener("click", () => finish(action.id));
        list.append(button);
        firstButton ??= button;
      });
      card.append(list);

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "app-action-sheet-cancel";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => finish(null));
      card.append(cancelButton);

      return firstButton;
    },
  });

export const openPromptDialog = ({ title = "", label = "", initialValue = "" } = {}) =>
  mountDialog({
    cancelValue: null,
    render: (card, finish) => {
      appendHeading(card, title);

      const field = document.createElement("label");
      field.className = "app-dialog-field";
      if (label) {
        const labelText = document.createElement("span");
        labelText.textContent = label;
        field.append(labelText);
      }
      const input = document.createElement("input");
      input.type = "text";
      input.value = initialValue;
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        finish(input.value);
      });
      field.append(input);
      card.append(field);

      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "app-dialog-cancel";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => finish(null));

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "app-dialog-confirm";
      confirmButton.textContent = "Save";
      confirmButton.addEventListener("click", () => finish(input.value));

      actions.append(cancelButton, confirmButton);
      card.append(actions);
      input.select();
      return input;
    },
  });
