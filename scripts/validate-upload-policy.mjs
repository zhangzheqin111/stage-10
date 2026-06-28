const baseUrl = (process.env.STAGE10_BASE_URL || process.env.STAGE9_BASE_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  ""
);
const expectedDefaultStorage = process.env.STAGE10_EXPECT_UPLOAD_STORAGE || "supabase";
const checkServerFallback = process.env.STAGE10_CHECK_SERVER_FALLBACK === "1";
const checkHead = process.env.STAGE10_CHECK_UPLOAD_HEAD !== "0";

const failures = [];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function createAudioForm() {
  const form = new FormData();
  const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  form.append("kind", "audio");
  form.append("file", blob, `stage10-upload-policy-${Date.now().toString(36)}.mp3`);
  return form;
}

async function expectUpload(label, headers, expectedStorage) {
  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers,
    body: createAudioForm()
  }).catch((error) => {
    fail(`${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

  if (!response) return null;

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    fail(`${label} did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  if (!response.ok) {
    fail(`${label} returned ${response.status}: ${payload.message || "no message"}`);
    return null;
  }

  if (payload.storage === expectedStorage) {
    pass(`${label} used storage: ${expectedStorage}`);
  } else {
    fail(`${label} used storage ${payload.storage || "(missing)"}, expected ${expectedStorage}`);
  }

  if (typeof payload.url === "string" && /^https?:\/\//.test(payload.url)) {
    pass(`${label} returned a public URL`);
    if (checkHead) await expectHead(payload.url, label);
  } else {
    fail(`${label} did not return a public URL`);
  }

  return payload;
}

async function expectHead(url, label) {
  const response = await fetch(url, { method: "HEAD" }).catch((error) => {
    fail(`${label} HEAD failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

  if (!response) return;

  if (response.ok) {
    pass(`${label} URL HEAD returned ${response.status}`);
  } else {
    fail(`${label} URL HEAD returned ${response.status}`);
  }
}

console.log(`Stage 10 upload-policy validation base: ${baseUrl}`);

await expectUpload("Default multipart audio upload", {}, expectedDefaultStorage);

if (checkServerFallback) {
  await expectUpload("Explicit server-media fallback upload", { "x-bloombeat-fast-media": "1" }, "server");
}

if (failures.length > 0) {
  console.error("");
  console.error(`Stage 10 upload-policy validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("");
console.log("Stage 10 upload-policy validation passed.");
