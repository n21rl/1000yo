export const createEmptyRecord = (message) => {
  const item = document.createElement("li");
  item.className = "record record-empty";
  const body = document.createElement("div");
  body.className = "record-body";
  const text = document.createElement("p");
  text.className = "supporting";
  text.textContent = message;
  body.append(text);
  item.append(body);
  return item;
};

export const createButton = (label, className, handler) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
};

export const renderRecords = ({ listElement, records, removeItem = null, emptyMessage = "No entries yet.", onAfterRemove = null }) => {
  listElement.innerHTML = "";
  if (!records.length) {
    if (emptyMessage) listElement.append(createEmptyRecord(emptyMessage));
    return;
  }

  for (const record of records) {
    const item = document.createElement("li");
    item.className = "record";
    const body = document.createElement("div");
    body.className = "record-body";

    if (record.title) {
      const title = document.createElement("strong");
      title.textContent = record.title;
      body.append(title);
    }
    if (record.text) {
      const text = document.createElement("p");
      text.textContent = record.text;
      body.append(text);
    }
    if (record.tags?.length) {
      const tags = document.createElement("div");
      tags.className = "record-tags";
      record.tags.forEach((tagText) => {
        const tag = document.createElement("span");
        tag.className = "record-tag";
        tag.textContent = tagText;
        tags.append(tag);
      });
      body.append(tags);
    }

    if (removeItem) {
      const removeButton = createButton("Remove", "ghost-button", () => {
        removeItem(record.index);
        onAfterRemove?.();
      });
      item.append(body, removeButton);
    } else {
      item.append(body);
    }

    listElement.append(item);
  }
};
