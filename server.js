const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 3000;

let allServersStatus = [];
let nextScanTime = null;

const jsonPath = path.join(__dirname, "public", "servers.json");

function getServers() {
  const filePath = path.join(__dirname, "ip.txt");
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").filter((line) => line.trim());
  } catch (error) {
    console.error("err reading servers.txt:", error.message);
    return [];
  }
}

async function checkServer(serverAddr) {
  let cleanAddr = serverAddr.trim();
  if (cleanAddr.endsWith("/")) {
    cleanAddr = cleanAddr.slice(0, -1);
  }

  const versionUrl = `${cleanAddr}/api/version`;
  const tagsUrl = `${cleanAddr}/api/tags`;

  try {
    const response = await axios.get(versionUrl, { timeout: 5000 });

    let models = [];
    try {
      const tagsResponse = await axios.get(tagsUrl, { timeout: 5000 });
      if (tagsResponse.data && tagsResponse.data.models) {
        models = tagsResponse.data.models.map((m) => m.name);
      }
    } catch (modelError) {
      console.log(
        `err fetching models from ${cleanAddr}, ${modelError.message}`,
      );
    }

    const status = {
      url: cleanAddr,
      status: "up",
      timestamp: new Date().toISOString(),
      models: models,
      error: null,
    };

    console.log(`${cleanAddr} up ${models.length} models`);
    return status;
  } catch (error) {
    const status = {
      url: cleanAddr,
      status: "down",
      timestamp: new Date().toISOString(),
      models: [],
      error: error.message,
    };

    console.log(`${cleanAddr} down (${error.message})`);
    return status;
  }
}

async function checkAllServers() {
  console.log(
    `\nstarting scan ${new Date().toLocaleTimeString()}`,
  );

  const servers = getServers();
  allServersStatus = [];

  for (let i = 0; i < servers.length; i++) {
    const status = await checkServer(servers[i]);
    allServersStatus.push(status);

    if (i < servers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const lastScan = new Date().toISOString();
  const jsonData = {
    lastScan: lastScan,
    servers: allServersStatus,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  const upCount = allServersStatus.filter((s) => s.status === "up").length;
  console.log(
    `saved, ${upCount}/${allServersStatus.length} servers up`,
  );

  scheduleScan();
}

function scheduleScan() {
  const nextScan = Date.now() + 3600000;
  nextScanTime = new Date(nextScan);

  const delay = nextScan - Date.now();
  console.log(
    `next scan at ${nextScanTime.toLocaleTimeString()}\n`,
  );

  setTimeout(checkAllServers, delay);
}

function initialize() {
  try {
    if (fs.existsSync(jsonPath)) {
      const existingData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const lastScan = new Date(existingData.lastScan);
      const now = Date.now();
      const timeSinceLastScan = now - lastScan.getTime();
      const oneHour = 3600000;

      if (timeSinceLastScan >= oneHour) {
        console.log(
          `last scan was ${Math.round(timeSinceLastScan / 60000)} minutes ago, scanning`,
        );
        checkAllServers();
      } else {
        allServersStatus = existingData.servers || [];
        const timeUntilNextScan = oneHour - timeSinceLastScan;
        console.log(`loaded previous scan data`);
        console.log(
          `next scan in ${Math.round(timeUntilNextScan / 60000)} minutes`,
        );

        nextScanTime = new Date(now + timeUntilNextScan);
        setTimeout(checkAllServers, timeUntilNextScan);
      }
    } else {
      console.log("checking servers");
      checkAllServers();
    }
  } catch (error) {
    console.error("error reading prev scan:", error.message);
    console.log("scanning");
    checkAllServers();
  }
}

initialize();
app.get("/api/status", (req, res) => {
  res.json({
    servers: allServersStatus,
    lastScan:
      allServersStatus.length > 0 ? allServersStatus[0].timestamp : null,
    nextScan: nextScanTime,
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`running on http://localhost:${PORT}`);
});
