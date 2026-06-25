const flowKey = "bloombeat-creation-flow";
const preserveEditKey = "bloombeat-preserve-edit";

function setSessionFlag(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Restricted browsers may block sessionStorage; creation should still work.
  }
}

function removeSessionFlag(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore restricted storage during navigation/reset.
  }
}

function hasSessionFlag(key: string) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function startCreationFlow() {
  if (typeof window === "undefined") {
    return;
  }

  setSessionFlag(flowKey);
}

export function stopCreationFlow() {
  if (typeof window === "undefined") {
    return;
  }

  removeSessionFlag(flowKey);
  removeSessionFlag(preserveEditKey);
}

export function markReturnToEdit() {
  if (typeof window === "undefined") {
    return;
  }

  setSessionFlag(flowKey);
  setSessionFlag(preserveEditKey);
}

export function shouldStartFromGuide() {
  if (typeof window === "undefined") {
    return false;
  }

  return !hasSessionFlag(flowKey);
}

export function consumePreserveEdit() {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldPreserve = hasSessionFlag(preserveEditKey);
  removeSessionFlag(preserveEditKey);
  return shouldPreserve;
}

export function isReloadNavigation() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}
