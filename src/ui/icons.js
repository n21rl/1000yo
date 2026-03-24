export const MATERIAL_ICON_NODES = {
  add: [
    ["path", { d: "M12 5v14" }],
    ["path", { d: "M5 12h14" }],
  ],
  close: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
  check_box_outline_blank: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2.5" }],
  ],
  check_box: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2.5" }],
    ["path", { d: "m8.5 12 2.5 2.5 4.5-5" }],
  ],
  menu_book: [
    ["path", { d: "M6 5.5A2.5 2.5 0 0 1 8.5 3H20v17H8.5A2.5 2.5 0 0 0 6 22" }],
    ["path", { d: "M6 5.5V22" }],
    ["path", { d: "M9.5 7H16" }],
  ],
  book_2: [
    ["path", { d: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 20" }],
    ["path", { d: "M5 5.5V20" }],
    ["path", { d: "M8.5 8H15" }],
    ["path", { d: "M8.5 12H15" }],
  ],
  delete: [
    ["path", { d: "M5 7h14" }],
    ["path", { d: "M9 7V5h6v2" }],
    ["path", { d: "M8 7l1 12h6l1-12" }],
    ["path", { d: "M10 10.5v5.5" }],
    ["path", { d: "M14 10.5v5.5" }],
  ],
  keyboard_arrow_down: [
    ["path", { d: "m7 10 5 5 5-5" }],
  ],
  sticky_note_2: [
    ["path", { d: "M6 4h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" }],
    ["path", { d: "M14 4v5h5" }],
  ],
  cognition: [
    ["path", { d: "M9.5 7a3.5 3.5 0 0 0-3.5 3.5c0 1 .42 1.9 1.1 2.54A3 3 0 0 0 9 18h1" }],
    ["path", { d: "M14.5 7a3.5 3.5 0 0 1 3.5 3.5c0 1-.42 1.9-1.1 2.54A3 3 0 0 1 15 18h-1" }],
    ["path", { d: "M12 6v12" }],
    ["path", { d: "M9 10.5h6" }],
    ["path", { d: "M9.5 14.5h5" }],
  ],
  person: [
    ["circle", { cx: "12", cy: "8", r: "3" }],
    ["path", { d: "M6 19a6 6 0 0 1 12 0" }],
  ],
  bolt: [
    ["path", { d: "M13 3 6.5 13H11l-1 8 6.5-10H12z" }],
  ],
  deployed_code: [
    ["path", { d: "m8.5 9-3 3 3 3" }],
    ["path", { d: "m15.5 9 3 3-3 3" }],
    ["path", { d: "M10 19h4" }],
    ["path", { d: "M12 5v10" }],
    ["path", { d: "M8 5h8" }],
  ],
  local_fire_department: [
    ["path", { d: "M12 3c1.5 2.5 4.5 4.4 4.5 8.1A4.5 4.5 0 1 1 7.5 11c0-1.8.8-3.2 2.3-4.8.2 1.5 1 2.4 2.2 3.1C13 7.8 13 5.7 12 3z" }],
  ],
};

export const resolveMaterialIconName = (name) => ({
  plus: "add",
  x: "close",
  square: "check_box_outline_blank",
  "square-check": "check_box",
  notebook: "book_2",
  trash: "delete",
})[name] ?? name;

export const createMaterialFallbackIcon = (name, classNames = []) => {
  const resolvedName = resolveMaterialIconName(name);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("material-icon", ...classNames);
  const nodes = MATERIAL_ICON_NODES[resolvedName] ?? [];
  nodes.forEach(([tagName, attributes]) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    svg.append(node);
  });
  return svg;
};

export const createMaterialIcon = (name, classNames = []) => {
  const resolvedName = resolveMaterialIconName(name);
  const img = document.createElement("img");
  img.classList.add("material-icon", ...classNames);
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.decoding = "async";
  img.loading = "lazy";
  img.src = `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${resolvedName}/default/24px.svg`;
  img.addEventListener("error", () => {
    img.replaceWith(createMaterialFallbackIcon(resolvedName, classNames));
  }, { once: true });
  return img;
};

export const hydrateStaticIcons = () => {
  document.querySelectorAll("[data-material-icon]").forEach((element) => {
    const iconName = element.dataset.materialIcon;
    if (!iconName) return;
    element.replaceChildren(createMaterialIcon(iconName));
  });
};
