const flowKey = "bloombeat-creation-flow";
const preserveEditKey = "bloombeat-preserve-edit";
const autoFlowKey = "bloombeat-auto-flow";

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
  // 同步写一个 localStorage 标记作为兜底，
  // 防止 sessionStorage 被某些移动端浏览器在跨子域/跨协议时清空。
  try {
    window.localStorage.setItem(autoFlowKey, "1");
  } catch {
    // Ignore.
  }
}

export function stopCreationFlow() {
  if (typeof window === "undefined") {
    return;
  }

  removeSessionFlag(flowKey);
  removeSessionFlag(preserveEditKey);
  try {
    window.localStorage.removeItem(autoFlowKey);
  } catch {
    // Ignore.
  }
}

export function markReturnToEdit() {
  if (typeof window === "undefined") {
    return;
  }

  setSessionFlag(flowKey);
  setSessionFlag(preserveEditKey);
}

/**
 * 关键修复：之前 `!hasSessionFlag(flowKey)` 会把通过 cloudflared 隧道/扫码直接打开
 * `/create/song` 的用户立刻弹回首頁（sessionStorage 在隧道下没值）。
 * 现在改为：检测不到 flow flag 时，自动把它写上，让用户能继续操作。
 * 用户在首页点 "开始制作" 时也会写一遍。
 */
export function shouldStartFromGuide() {
  if (typeof window === "undefined") {
    return false;
  }

  if (hasSessionFlag(flowKey)) {
    return false;
  }

  // localStorage 兜底：有值说明之前进过流程，放行
  try {
    if (window.localStorage.getItem(autoFlowKey) === "1") {
      // 同步回填 sessionStorage
      setSessionFlag(flowKey);
      return false;
    }
  } catch {
    // Ignore.
  }

  // 既没 sessionStorage 也没 localStorage flag —— 首次访问，放行并写入标记
  startCreationFlow();
  return false;
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
