const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function recordShowcase() {
  const outputDir = path.resolve(__dirname, "../videos");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("🎬 [1/5] Launching Chrome in 1920x1080 with Playwright video recorder...");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: [
      "--enable-webgl",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  console.log("🌐 [2/5] Navigating to http://localhost:3000/showcase?autoplay=true...");
  await page.goto("http://localhost:3000/showcase?autoplay=true", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  console.log("🎥 [3/5] Recording Ghost AI Feature Showcase in action...");
  console.log("   -> Feature 1: Real-Time Collaborative Architecture Canvas");
  console.log("   -> Feature 2: 1-Click System Templates (Microservices Topology)");
  console.log("   -> Feature 3: Autonomous Ghost AI Topology Synthesizer (Gemini)");
  console.log("   -> Feature 4: Technical Specification (PRD) Synthesis & Export");
  console.log("   -> Feature 5: Production Architecture Overview & Outro");

  // Total presentation run time is ~52 seconds
  await page.waitForTimeout(54000);

  console.log("💾 [4/5] Saving recorded master video...");
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  console.log(`✓ Master raw WebM video saved: ${videoPath}`);

  // FFmpeg conversion to pristine MP4
  const finalMp4Path = path.join(outputDir, "ghost-ai-feature-showcase.mp4");
  const ffmpegExe =
    "C:\\Users\\Priyanshu Goswami\\AppData\\Roaming\\Python\\Python314\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v9.0.2.exe";

  console.log(`🔄 [5/5] Transcoding to high-bitrate MP4 via FFmpeg (${finalMp4Path})...`);

  try {
    const ffmpegCmd = `"${ffmpegExe}" -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 -movflags +faststart "${finalMp4Path}"`;
    execSync(ffmpegCmd, { stdio: "inherit" });
    console.log(`\n🎉 SUCCESS! Video exported to: ${finalMp4Path}`);
    const stats = fs.statSync(finalMp4Path);
    console.log(`   File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  } catch (err) {
    console.error("FFmpeg transcode error:", err.message);
  }
}

recordShowcase().catch((err) => {
  console.error("Error during recording:", err);
  process.exit(1);
});
