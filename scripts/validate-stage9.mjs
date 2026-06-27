const baseUrl = (process.env.STAGE9_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const giftIds = (process.env.STAGE9_GIFT_IDS || "gift-mqwgelr1-6c6f22e0,gift-mqv7kqc8-10a79722")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const checkMediaHead = process.env.STAGE9_CHECK_MEDIA_HEAD === "1";

const routes = ["/", "/create/song", "/create/content", "/create/preview"];
const failures = [];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

async function expectOk(path) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    if (response.status === 200) {
      pass(`${path} returned 200`);
      return response;
    }
    fail(`${path} returned ${response.status}`);
  } catch (error) {
    fail(`${path} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return null;
}

function isPublicUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value) && !value.startsWith("data:");
}

async function validateGift(id) {
  await expectOk(`/gift/${encodeURIComponent(id)}`);

  const apiResponse = await expectOk(`/api/gifts/${encodeURIComponent(id)}`);
  if (!apiResponse) return;

  let payload;
  try {
    payload = await apiResponse.json();
  } catch (error) {
    fail(`/api/gifts/${id} did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const gift = payload?.gift ?? payload;

  if (typeof gift.title === "string" && gift.title.trim()) {
    pass(`${id} has title: ${gift.title}`);
  } else {
    fail(`${id} is missing a title`);
  }

  if (typeof gift.blessingText === "string" && gift.blessingText.trim()) {
    pass(`${id} has blessing text`);
  } else {
    fail(`${id} is missing blessing text`);
  }

  if (gift.songSourceType === "upload") {
    if (isPublicUrl(gift.audioUrl)) {
      pass(`${id} uploaded audio uses a public URL`);
      if (checkMediaHead) await expectHead(gift.audioUrl, `${id} uploaded audio`);
    } else {
      fail(`${id} uploaded audio is not a public URL`);
    }
  }

  if (typeof gift.backgroundImageUrl === "string" && gift.backgroundImageUrl.length > 0) {
    if (isPublicUrl(gift.backgroundImageUrl) || gift.backgroundImageUrl.startsWith("/theme-backgrounds/")) {
      pass(`${id} background image is share-safe`);
      if (checkMediaHead && isPublicUrl(gift.backgroundImageUrl)) {
        await expectHead(gift.backgroundImageUrl, `${id} background image`);
      }
    } else {
      fail(`${id} background image is not share-safe`);
    }
  }
}

async function expectHead(url, label) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      pass(`${label} HEAD returned ${response.status}`);
    } else {
      fail(`${label} HEAD returned ${response.status}`);
    }
  } catch (error) {
    fail(`${label} HEAD failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`Stage 9 validation base: ${baseUrl}`);

for (const route of routes) {
  await expectOk(route);
}

for (const id of giftIds) {
  await validateGift(id);
}

if (failures.length > 0) {
  console.error("");
  console.error(`Stage 9 validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("");
console.log("Stage 9 validation passed.");
