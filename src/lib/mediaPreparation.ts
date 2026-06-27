import { uploadCloudResource } from "./cloudGiftStore";

type ResourceKind = "audio" | "image";

type WindowWithMediaPreparation = Window & {
  __bloombeatMediaPreparation?: Map<string, Promise<string>>;
};

function getPreparationTasks() {
  if (typeof window === "undefined") {
    return new Map<string, Promise<string>>();
  }

  const host = window as WindowWithMediaPreparation;
  if (!host.__bloombeatMediaPreparation) {
    host.__bloombeatMediaPreparation = new Map<string, Promise<string>>();
  }
  return host.__bloombeatMediaPreparation;
}

export function prepareCloudResourceOnce(dataUrl: string, kind: ResourceKind) {
  if (!dataUrl.startsWith("data:")) {
    return Promise.resolve(dataUrl);
  }

  const tasks = getPreparationTasks();
  const key = `${kind}:${dataUrl}`;
  const existingTask = tasks.get(key);
  if (existingTask) {
    return existingTask;
  }

  const task = uploadCloudResource(dataUrl, kind).catch((error) => {
    tasks.delete(key);
    throw error;
  });
  tasks.set(key, task);
  return task;
}
