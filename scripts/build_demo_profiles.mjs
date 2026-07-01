import fs from "node:fs/promises";

const input =
  "C:/Users/Dylan/Documents/Codex/2026-06-30/use-github-to-debug-my-project/outputs/philly-profile-cleanup/Philly_Music_Users_Corrected.csv";
const output = new URL("../demo/data/profiles.json", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])));
}

const neighborhoods = [
  ["Center City", 39.9526, -75.1652],
  ["Fishtown", 39.9719, -75.1260],
  ["University City", 39.9522, -75.1932],
  ["South Philly", 39.9250, -75.1690],
  ["Manayunk", 40.0267, -75.2238],
  ["Northern Liberties", 39.9647, -75.1408],
  ["West Philly", 39.9584, -75.2196],
  ["Germantown", 40.0434, -75.1818],
  ["East Falls", 40.0140, -75.1923],
  ["Old City", 39.9500, -75.1450],
  ["Passyunk", 39.9338, -75.1627],
  ["Fairmount", 39.9672, -75.1735]
];

function nearestNeighborhood(lat, lon) {
  return neighborhoods
    .map(([name, nlat, nlon]) => ({ name, distance: (lat - nlat) ** 2 + (lon - nlon) ** 2 }))
    .sort((a, b) => a.distance - b.distance)[0].name;
}

const trackTitles = [
  "Midnight on Girard", "Soft Static", "River Lights", "Second Coffee",
  "Neon Weather", "Southbound", "Borrowed Time", "Blue Hour",
  "Windows Down", "After the El", "Parallel Lines", "Cherry Street",
  "Warm Signal", "Half Awake", "Late Checkout", "Sunday Frequency",
  "City in Stereo", "Slow Bloom", "Under Market Street", "Golden Noise"
];

function numeric(row, key) {
  return Number(row[key]);
}

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

const raw = parseCsv(await fs.readFile(input, "utf8"));
const nonGhost = raw.map((row, index) => ({ row, index }))
  .filter(({ row }) => row["Privacy Mode"] !== "Ghost");
const liveIndexes = new Set(nonGhost.slice(0, 12).map(({ index }) => index));
const sessionIndexes = new Set(nonGhost.slice(0, 5).map(({ index }) => index));

const profiles = raw.map((row, index) => {
  const artists = row["Top Artists"].split(";").map((artist) => artist.trim()).filter(Boolean);
  const palette = row["Theme Palette"].split(",").map((color) => color.trim());
  const isLive = liveIndexes.has(index);
  const inSession = sessionIndexes.has(index);
  const duration = 182 + ((index * 29) % 178);
  const progress = 12 + ((index * 17) % 74);
  return {
    id: `phl_${String(index + 1).padStart(3, "0")}`,
    name: row.Name,
    username: row.Username,
    displayName: row["Display Name"],
    initials: initials(row.Name),
    bio: row.Bio,
    avatarUrl: row["User Avatar"],
    location: {
      latitude: numeric(row, "Latitude"),
      longitude: numeric(row, "Longitude"),
      neighborhood: nearestNeighborhood(numeric(row, "Latitude"), numeric(row, "Longitude"))
    },
    privacyMode: row["Privacy Mode"].toLowerCase().replaceAll(" ", "-"),
    streamingService: row["Streaming Service"],
    palette,
    vibe: {
      valence: numeric(row, "Valence"),
      energy: numeric(row, "Energy"),
      danceability: numeric(row, "Danceability"),
      acousticness: numeric(row, "Acousticness")
    },
    topArtists: artists,
    followerCount: numeric(row, "Follower Count"),
    followingCount: numeric(row, "Following Count"),
    followers: row["Follower List"].split(",").map((user) => user.trim()).filter(Boolean),
    following: row["Following List"].split(",").map((user) => user.trim()).filter(Boolean),
    dateJoined: row["Date Joined"],
    status: row["Privacy Mode"] === "Ghost" ? "private" : inSession ? "in-session" : isLive ? "listening" : "offline",
    currentTrack: isLive ? {
      id: `demo_track_${String(index + 1).padStart(3, "0")}`,
      name: trackTitles[index % trackTitles.length],
      artist: artists[0],
      album: `${nearestNeighborhood(numeric(row, "Latitude"), numeric(row, "Longitude"))} Sessions`,
      durationSeconds: duration,
      progressPercent: progress,
      explicit: false,
      provider: row["Streaming Service"].toLowerCase().replaceAll(" ", "_")
    } : null,
    metrics: {
      totalListeningHours: numeric(row, "Total Listening Hours"),
      sessionsHosted: numeric(row, "Sessions Hosted"),
      sessionsJoined: numeric(row, "Sessions Joined"),
      totalTetheredMinutes: numeric(row, "Total Tethered Minutes"),
      pulsesSent: numeric(row, "Pulses Sent"),
      pulsesReceived: numeric(row, "Pulses Received"),
      memoryAnchors: numeric(row, "Memory Anchors"),
      capsulesSent: numeric(row, "Capsules Sent"),
      capsulesReceived: numeric(row, "Capsules Received"),
      longestSharedSessionMinutes: numeric(row, "Longest Shared Session Minutes"),
      listeningStreakDays: numeric(row, "Listening Streak Days")
    }
  };
});

await fs.mkdir(new URL("../demo/data/", import.meta.url), { recursive: true });
await fs.writeFile(output, JSON.stringify({ generatedAt: "2026-06-30", profiles }, null, 2));
console.log(`Wrote ${profiles.length} profiles to ${output.pathname}`);
