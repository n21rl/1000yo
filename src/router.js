export const parseRouteHash = (hash = "") => {
  const normalizedHash = hash || "#/menu";
  const match = normalizedHash.match(/^#\/([a-z]+)(?:\/([^/]+))?$/i);
  const route = match?.[1]?.toLowerCase() ?? "menu";
  const routeId = match?.[2] ?? "";
  if (route === "create") return { screen: "creation", vampireId: "" };
  if (route === "play") return { screen: "play", vampireId: routeId };
  return { screen: "menu", vampireId: "" };
};
