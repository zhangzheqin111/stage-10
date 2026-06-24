const flowKey = "bloombeat-creation-flow";
const preserveEditKey = "bloombeat-preserve-edit";

export function startCreationFlow() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(flowKey, "1");
}

export function stopCreationFlow() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(flowKey);
  window.sessionStorage.removeItem(preserveEditKey);
}

export function markReturnToEdit() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(flowKey, "1");
  window.sessionStorage.setItem(preserveEditKey, "1");
}

export function shouldStartFromGuide() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(flowKey) !== "1";
}

export function consumePreserveEdit() {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldPreserve = window.sessionStorage.getItem(preserveEditKey) === "1";
  window.sessionStorage.removeItem(preserveEditKey);
  return shouldPreserve;
}

export function isReloadNavigation() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}
