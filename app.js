const state = {
  profiles: [],
  filter: "all",
  search: "",
  following: new Set(),
  selected: null,
  selectedPing: null,
  session: null,
  discoverMode: "swipe",
  radiusMiles: 15,
  userPrivacy: "open-door",
  muted: new Set(),
  severed: new Set(),
  transparentPresence: new Set(),
  pulseCharging: false,
  pulseReady: false,
  pulseStartedAt: 0,
  pulseChargeTimer: null,
  pulseCooldownUntil: 0,
  sessionPaused: false,
  pulsesThisSession: 0,
  pulseCooldownTimerId: null,
  sessionStartedAt: 0,
  sessionTimerId: null,
  toastTimer: null,
  lastFocused: null
  ,swipeQueue: []
  ,swipeIndex: 0
  ,conversations: []
  ,musicService: "Spotify"
  ,wavelengthReady: false
  ,wavelengthStep: 0
  ,wavelengthProfile: { goal:"friends", gender:"", customGender:"", orientation:"", height:"", weight:"", avoidArtist:"", priorityArtist:"" }
  ,wavelengthUnlocked: new Set()
  ,reviewScore: 0
  ,sessionPulseCount: 0
  ,sessionIsSelf: false
  ,sessionTrack: null
  ,sessionJoinTimerId: null
  ,ratedHistory: []
  ,openThreads: new Set()
  ,bookmarked: new Set()
  ,userReplies: {}
  ,popKeys: new Set()
  ,seenViews: new Set(["home"])
  ,threads: null
};

const CURRENT_USER = {
  name: "John Roastpork",
  username: "john.roastpork",
  initials: "JR",
  latitude: 39.921162,
  longitude: -75.144890,
  neighborhood: "Pennsport",
  vibe: [0.64, 0.72, 0.68, 0.31],
  topArtists: ["Japanese Breakfast", "Bon Iver", "Kaytranada", "Radiohead", "Frank Ocean"]
};
const MOODS = ["Calm", "Nostalgic", "Heavy", "Discovery", "Night drive"];
const MUSIC_BIO_PATTERNS = [
  p => `I build playlists for late walks and always leave room for ${p.topArtists[0]}.`,
  p => `Album-order purist. Currently trying to convert everyone to ${p.topArtists[1]}.`,
  p => `Ask me for a three-song introduction to ${p.topArtists[0]}.`,
  p => `I chase tiny venues, huge bridges, and songs that reward headphones.`,
  p => `My best friendships started with “wait, you know this song too?”`,
  p => `Usually somewhere between ${p.topArtists[0]} and ${p.topArtists[2]}.`,
  p => `I make overly specific playlists for weather, SEPTA rides, and dinner.`,
  p => `Looking for people who listen all the way through the outro.`,
  p => `Live-show regular with strong opinions about track sequencing.`,
  p => `Send me the song you never skip, even after a hundred plays.`,
  p => `${p.topArtists[0]} in the morning, ${p.topArtists[1]} after midnight.`,
  p => `I trade deep cuts, concert stories, and immaculate walking playlists.`
];
const AVATAR_ASSIGNMENTS = {
  realjoseph:"x_joseph_x", realhiroshi:"realkevin", richard8428:"carol.harris", realwilliam:"realwilliam",
  zuri1188:"jonesvibes", james_341:"zuri1188", raj_539:"raj.martin", "matthew.miller":"linda_331",
  realmary:"davisvibes", linda_331:"patricia_616", donald3144:"realsteven", "joshua.nelson":"margaret3780",
  davisvibes:"realmary", x_patricia_x:"x_patricia_x", realkevin:"matthew.miller", kevin3041:"raj_725",
  margaret3780:"thomasvibes", ashley_681:"ashley_681", x_christopher_x:"kevin3041", x_zuri_x:"x_christopher_x",
  patricia_616:"aaliyah_886", realjohn:"realjohn", susan5941:"susan5941", paul_882:"joseph.patel",
  wei4937:"wei4937", matthew9779:"matthew9779", "andrew.walker":"andrew.walker", "raj.martin":"raj_539",
  x_kimberly_x:"amanda_127", silvavibes:"donald3144", "christopher.perez":"silvavibes", raj_725:"joshua.nelson",
  aaliyah9327:"jennifer_414", aaliyah_886:"realjoseph", x_david_x:"steven3240", thomasvibes:"carol2035",
  realsteven:"x_zuri_x", steven3240:"realhiroshi", amanda_127:"x_kimberly_x", carol2035:"david2582",
  hassan_427:"x_david_x", jonesvibes:"amanda6105", x_joseph_x:"paul_882", "carol.harris":"richard8428",
  david2582:"aaliyah9327", "joseph.patel":"christopher.perez", amanda6105:"hassan_427",
  jennifer_414:"james_341", "yuki.johnson":"yuki.johnson", allenvibes:"allenvibes"
};
const anchors = [
  { id: "a1", username: "zuri1188", track: "Neon Weather", artist: "Burna Boy", minutes: 48, pulses: 3, date: "Last Wednesday · 12:34 AM", mood: "Nostalgic", distance: "8.6 miles", health: 92 },
  { id: "a2", username: "raj_539", track: "Borrowed Time", artist: "Aminé", minutes: 31, pulses: 1, date: "Saturday · 11:20 PM", mood: "Calm", distance: "3.8 miles", health: 78 },
  { id: "a3", username: "james_341", track: "Southbound", artist: "Radiohead", minutes: 61, pulses: 7, date: "June 22 · 1:03 AM", mood: "Night drive", distance: "3.2 miles", health: 64 }
];
const capsules = [
  { id: "c1", username: "linda_331", track: "After the El", artist: "Japanese Breakfast", lock: "After midnight", opened: false, direction: "received" },
  { id: "c2", username: "realwilliam", track: "Second Coffee", artist: "Remi Wolf", lock: "When it rains", opened: false, direction: "sent" },
  { id: "c3", username: "joshua.nelson", track: "Cherry Street", artist: "Bon Iver", lock: "No lock", opened: true, direction: "received" }
];
const reviews = [
  { username:"realhiroshi", type:"album", title:"Imaginal Disk", artist:"Magdalena Bay", score:4.5, body:"Maximal without becoming shapeless. Every synth choice feels like another doorway, but the melodies keep pulling the whole thing back into focus.", subjectRatings:184, reviewRating:4.7, time:"18m" },
  { username:"zuri1188", type:"track", title:"Eusexua", artist:"FKA twigs", score:5, body:"A song that understands the dance floor as somewhere spiritual. The restraint is what makes the release hit.", subjectRatings:96, reviewRating:4.9, time:"42m" },
  { username:"james_341", type:"album", title:"The New Sound", artist:"Geordie Greep", score:4, body:"Chaotic, theatrical, occasionally exhausting—and completely committed to its own strange internal logic.", subjectRatings:211, reviewRating:4.2, time:"1h" },
  { username:"linda_331", type:"artist", title:"Japanese Breakfast", artist:"Artist retrospective", score:4.5, body:"Grief and joy treated as neighbors instead of opposites. The songwriting keeps getting more expansive without losing intimacy.", subjectRatings:73, reviewRating:4.8, time:"3h" }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return value.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function formatApproxCount(value) {
  if (value >= 1000) return `${Math.floor(value / 1000)}K+`;
  if (value >= 100) return `${Math.floor(value / 100) * 100}+`;
  if (value >= 10) return `${Math.floor(value / 10) * 10}+`;
  return "a few";
}

function signalBloomStrip(score, compact = false) {
  return `<span class="signal-bloom-strip ${compact ? "compact" : ""}" aria-label="${score} out of 5">${[1,2,3,4,5].map(value => {
    const fill = score >= value ? 100 : score >= value - .5 ? 50 : 0;
    return `<i class="signal-bloom" style="--bloom-fill:${fill}%"><span></span></i>`;
  }).join("")}</span>`;
}

function compatibility(profile) {
  const base = 54 + (artHash(profile.username) % 39);
  const sharedArtistBoost = profile.topArtists.some(artist => CURRENT_USER.topArtists.includes(artist)) ? 6 : 0;
  const proximityBoost = distanceMiles(profile) <= 5 ? 2 : 0;
  return Math.min(97, base + sharedArtistBoost + proximityBoost);
}

function buildConversations() {
  const lines = [
    "That transition was ridiculous — tether later?",
    "Sent you a Time Capsule ✦",
    "I’m listening now if you want to drop in.",
    "This track made me think of your night-drive playlist.",
    "Pulse received. Perfect timing.",
    "You: absolutely, give me five minutes."
  ];
  state.conversations = state.profiles.slice(2, 12).map((profile, index) => ({
    profile,
    preview: lines[index % lines.length],
    time: index < 2 ? `${9 - index}:4${index}` : index < 5 ? "Yesterday" : "Mon",
    unread: index < 3,
    messages: [
      { mine:false, text:index % 2 ? "I found something you need to hear." : "You around for a quick tether?" },
      { mine:true, text:index % 2 ? "Send it. I’m walking along the river." : "Yeah — opening the app now." },
      { mine:false, track:true, text:profile.currentTrack ? `${profile.currentTrack.name} · ${profile.currentTrack.artist}` : `${profile.topArtists[0]} radio · live mix` },
      { mine:false, text:lines[index % lines.length] }
    ]
  }));
}

function isDatingCompatible(profile) {
  const mine = state.wavelengthProfile;
  if (mine.goal !== "dating" || !mine.orientation || !mine.gender) return true;
  const myGender = mine.gender;
  const theirGender = profile.demoGender;
  const theirs = profile.demoOrientation;
  if (["Bisexual","Queer / open"].includes(mine.orientation)) {
    return ["Bisexual","Queer / open"].includes(theirs) ||
      (theirs === "Straight" && ["Man","Woman"].includes(myGender) && myGender !== theirGender) ||
      (theirs === "Gay" && myGender === theirGender);
  }
  if (mine.orientation === "Straight") {
    return ["Man","Woman"].includes(myGender) && myGender !== theirGender && ["Straight","Bisexual","Queer / open"].includes(theirs);
  }
  return myGender === theirGender && ["Gay","Bisexual","Queer / open"].includes(theirs);
}

function rebuildWavelengthQueue() {
  const settings = state.wavelengthProfile;
  const avoid = settings.avoidArtist.trim().toLowerCase();
  const priority = settings.priorityArtist.trim().toLowerCase();
  state.swipeQueue = [...state.profiles]
    .filter(profile => profile.privacyMode !== "ghost" && !state.severed.has(profile.username) && isDatingCompatible(profile))
    // TopArtists represents sustained affinity. Incidental track history is
    // intentionally ignored so a casual play never excludes a person.
    .filter(profile => !avoid || !profile.topArtists.some(artist => artist.toLowerCase() === avoid))
    .sort((a,b) => {
      const aPriority = priority && a.topArtists.slice(0,3).some(artist => artist.toLowerCase() === priority) ? 1 : 0;
      const bPriority = priority && b.topArtists.slice(0,3).some(artist => artist.toLowerCase() === priority) ? 1 : 0;
      return bPriority - aPriority || (artHash(a.username) % 1000) - (artHash(b.username) % 1000);
    });
  state.swipeIndex = 0;
  renderSwipeDeck();
}

function syncWavelengthHeader() {
  const dating = state.wavelengthProfile.goal === "dating";
  const goal = $("#wavelength-goal");
  const pool = $("#wavelength-pool-label");
  if (goal) goal.textContent = dating ? "Dating" : "Friends";
  if (pool) pool.textContent = dating ? "dating profiles selected for you" : "music people near you";
}

function wavelengthDistanceBand(profile) {
  const miles = distanceMiles(profile);
  if (!Number.isFinite(miles)) return "in Philadelphia";
  if (miles <= 5) return "within 5 miles";
  if (miles <= 10) return "5–10 miles away";
  if (miles <= 15) return "10–15 miles away";
  return "15+ miles away";
}

function wavelengthReason(profile) {
  const shared = profile.topArtists.filter(artist => CURRENT_USER.topArtists.includes(artist));
  if (shared.length) return `You both keep ${shared[0]} in rotation`;
  const signatures = [
    ["energy", profile.vibe.energy, CURRENT_USER.vibe[1]],
    ["danceability", profile.vibe.danceability, CURRENT_USER.vibe[2]],
    ["mood", profile.vibe.valence, CURRENT_USER.vibe[0]],
    ["acoustic taste", profile.vibe.acousticness, CURRENT_USER.vibe[3]]
  ].sort((a,b) => Math.abs(a[1]-a[2]) - Math.abs(b[1]-b[2]));
  return `Your ${signatures[0][0]} signatures are closely aligned`;
}

function wavelengthBio(profile) {
  return profile.bio
    .replace(/^\d+\s*\|\s*[^|]+\|\s*/i, "")
    .replace(/^fun fact:\s*/i, "")
    .replace(/^i\b/, "I");
}

function renderSwipeDeck() {
  const deck = $("#swipe-deck");
  if (!deck) return;
  const available = state.swipeQueue.slice(state.swipeIndex, state.swipeIndex + 3).reverse();
  if (!available.length) {
    deck.innerHTML = `<div class="empty-state"><strong>You reached the edge of Philly.</strong><p>Everyone you saw remains available in People.</p><button class="btn" data-reset-deck>Start again</button></div>`;
    $("[data-reset-deck]", deck).addEventListener("click", () => { state.swipeIndex = 0; renderSwipeDeck(); });
    return;
  }
  deck.innerHTML = available.map((profile, reversedIndex) => {
    const isTop = reversedIndex === available.length - 1;
    const track = profile.currentTrack || { name:`${profile.topArtists[0]} radio`, artist:"Recently played" };
    const intent = state.wavelengthProfile.goal === "dating" ? "Dating" : "Friends";
    const status = profile.status === "listening" ? "listening now" : profile.status === "in-session" ? "in a Tether" : "recently active";
    const identityLine = state.wavelengthProfile.goal === "dating"
      ? `${escapeHtml(profile.demoGender)} · ${wavelengthDistanceBand(profile)}`
      : `${escapeHtml(profile.topArtists[0])}-leaning · ${profile.topArtists.filter(artist => CURRENT_USER.topArtists.includes(artist)).length ? `${profile.topArtists.filter(artist => CURRENT_USER.topArtists.includes(artist)).length} shared artist` : "fresh discovery"}`;
    const displayName = state.wavelengthProfile.goal === "dating"
      ? `${escapeHtml(profile.name)}, ${profile.demoAge}`
      : escapeHtml(profile.name);
    return `<article class="swipe-card wavelength-profile-card" ${isTop ? `data-swipe-card data-username="${escapeHtml(profile.username)}"` : ""} style="--card-a:${profile.palette[0]};--card-b:${profile.palette[2]}">
      <div class="swipe-art">
        <div class="wavelength-photo-noise"></div>
        <span class="wavelength-intent-badge">${intent}</span>
        <span class="swipe-match">${compatibility(profile)}% match</span>
        <div class="wavelength-portrait" style="${paletteStyle(profile)}">
          <span>${escapeHtml(profile.initials)}</span>${profile.avatarUrl ? `<img class="avatar-photo portrait-photo" src="${escapeHtml(profile.avatarUrl)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<i></i><i></i>
        </div>
        <div class="wavelength-card-identity">
          <div><h3>${displayName}</h3><p>${identityLine}</p></div>
          <span class="wavelength-active"><i></i>${status}</span>
        </div>
      </div>
      <div class="swipe-copy">
        <p class="wavelength-reason"><span>≈</span>${escapeHtml(wavelengthReason(profile))}</p>
        <p class="swipe-bio">${escapeHtml(wavelengthBio(profile))}</p>
        <div class="swipe-track"><small>${status}</small><strong>${escapeHtml(track.name)} · ${escapeHtml(track.artist)}</strong></div>
        <div class="wavelength-taste"><small>their sound</small><div class="swipe-tags">${profile.topArtists.slice(0,3).map((a,index) => `<span><b>${index + 1}</b>${escapeHtml(a)}</span>`).join("")}</div></div>
      </div>
    </article>`;
  }).join("");
  enableCardDrag();
}

function actOnSwipe(direction) {
  const card = $("[data-swipe-card]");
  const profile = state.swipeQueue[state.swipeIndex];
  if (!card || !profile) return;
  card.classList.add(direction === "connect" ? "fly-right" : "fly-left");
  if (direction === "connect") {
    state.following.add(profile.username);
    toast(`You and ${profile.name} are now connected ✦`);
  }
  setTimeout(() => { state.swipeIndex++; renderSwipeDeck(); renderProfiles(); }, 330);
}

function enableCardDrag() {
  const card = $("[data-swipe-card]");
  if (!card) return;
  let dragging = false, startX = 0, deltaX = 0;
  card.addEventListener("pointerdown", event => {
    dragging = true; startX = event.clientX; deltaX = 0;
    card.setPointerCapture(event.pointerId); card.classList.add("dragging");
  });
  card.addEventListener("pointermove", event => {
    if (!dragging) return;
    deltaX = event.clientX - startX;
    card.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 18}deg)`;
  });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove("dragging"); card.style.transform = "";
    if (Math.abs(deltaX) > 85) actOnSwipe(deltaX > 0 ? "connect" : "pass");
  };
  card.addEventListener("pointerup", finish);
  card.addEventListener("pointercancel", finish);
}

function ensureConversation(profile) {
  let conversation = state.conversations.find(c => c.profile.username === profile.username);
  if (!conversation) {
    conversation = { profile, preview: "Start a conversation", time: "Now", unread: false, messages: [] };
    state.conversations.unshift(conversation);
  }
  return conversation;
}

function conversationReply(conversation) {
  const p = conversation.profile;
  const artist = p.topArtists[0];
  const track = p.currentTrack;
  const message = conversation.messages.filter(item => item.mine).at(-1)?.text.toLowerCase() || "";
  if (/\b(hi|hello|hey|yo)\b/.test(message)) return `Hey! I’m listening to ${track?.name || artist} right now — want to join?`;
  if (/\b(what|song|listening|playing)\b/.test(message)) return track
    ? `${track.name} by ${track.artist}. The next section is the reason I sent it.`
    : `${artist} radio. I’ll send you the standout track when it lands.`;
  if (/\b(join|tether|listen together)\b/.test(message)) return "Yes — open your stage and I’ll drop in.";
  if (/\b(love|great|good|amazing|fire)\b/.test(message)) return "Exactly. It gets even better in the second half.";
  const pool = [
    track ? `Honestly ${track.name} has been on repeat all week.` : `I keep coming back to ${artist} lately.`,
    "Yes! Open your stage, I'll drop in.",
    `That reminds me — I owe you a ${artist} deep cut.`,
    "Perfect timing, I was just queuing something up.",
    track ? `Wait until this ${track.artist} bridge hits. Tether me.` : "Send me what you're hearing right now."
  ];
  const seed = [...p.username].reduce((sum, ch) => sum + ch.charCodeAt(0), conversation.messages.length);
  return pool[seed % pool.length];
}

function presenceState(profile) {
  if (profile.status === "in-session") {
    return { tone: "tethered", label: "tethered", action: profile.privacyMode === "knock-first" ? "Knock" : "Join" };
  }
  if (profile.status === "listening") {
    return { tone: profile.privacyMode === "knock-first" ? "knock" : "open", label: "listening", action: profile.privacyMode === "knock-first" ? "Knock" : "Join" };
  }
  return { tone: "recent", label: "recent", action: "Message" };
}

function presencePerson(profile, context) {
  const presence = presenceState(profile);
  const attribute = context === "messages"
    ? `data-presence-chat="${escapeHtml(profile.username)}"`
    : `data-home-session="${escapeHtml(profile.username)}"`;
  return `<button class="presence-person ${presence.tone}" ${attribute} aria-label="${escapeHtml(profile.name)}, ${presence.label}">
    <span class="presence-avatar">${avatarSpan(profile)}<b aria-hidden="true"></b></span>
    <small>${escapeHtml(profile.name.split(" ")[0])}</small>
    <em>${presence.label}</em>
  </button>`;
}

function renderPresenceRail(container, profiles, context) {
  if (!container) return;
  container.innerHTML = profiles.slice(0, 8).map(profile => presencePerson(profile, context)).join("");
  if (context === "messages") {
    $$("[data-presence-chat]", container).forEach(button => button.addEventListener("click", () => {
      const profile = profileByUsername(button.dataset.presenceChat);
      if (!profile) return;
      ensureConversation(profile);
      openConversation(profile.username);
    }));
  }
}

function renderConversations(query = "") {
  const list = $("#conversation-list");
  const items = state.conversations
    .filter(c => !state.severed.has(c.profile.username))
    .filter(c => `${c.profile.name} ${c.profile.username}`.toLowerCase().includes(query.toLowerCase()));
  list.innerHTML = items.length ? items.map((conversation, index) => `<article class="conversation" data-conversation="${conversation.profile.username}">
    ${avatarSpan(conversation.profile)}
    <div class="conversation-copy"><div class="conversation-top"><strong>${escapeHtml(conversation.profile.name)}</strong><time>${conversation.time}</time></div><p>${escapeHtml(conversation.preview)}</p></div>
    ${conversation.unread ? `<i class="unread-dot"></i>` : `<span></span>`}
  </article>`).join("") : `<p class="empty">No conversations match${query ? ` “${escapeHtml(query)}”` : ""}.</p>`;
  const presenceRail = $("#message-presence-rail");
  if (presenceRail) {
    const available = state.profiles
      .filter(profile => ["listening","in-session"].includes(profile.status) && profile.currentTrack)
      .filter(profile => !state.severed.has(profile.username) && !state.muted.has(profile.username))
      .sort((a,b) => compatibility(b) - compatibility(a));
    renderPresenceRail(presenceRail, available, "messages");
  }
  $$("[data-conversation]", list).forEach(item => item.addEventListener("click", () => openConversation(item.dataset.conversation)));
  updateUnreadBadge();
}

function updateUnreadBadge() {
  const badge = $("[data-unread-badge]");
  if (!badge) return;
  const unread = state.conversations.filter(c => c.unread).length;
  badge.hidden = unread === 0;
  badge.textContent = unread;
}

function openConversation(username) {
  const conversation = state.conversations.find(c => c.profile.username === username);
  if (!conversation) return;
  conversation.unread = false;
  updateUnreadBadge();
  const p = conversation.profile;
  const sheet = document.createElement("section");
  sheet.className = "chat-sheet";
  sheet.innerHTML = `<header class="chat-head"><button data-close-chat>‹</button>${avatarSpan(p, "avatar small")}<div class="chat-head-copy"><strong>${escapeHtml(p.name)}</strong><span>${p.status === "listening" ? "● listening now" : "last here recently"}</span></div><button data-chat-profile>•••</button></header>
    <div class="chat-stage">${conversation.messages.map(m => `<div class="message-row ${m.mine ? "mine" : ""}"><div class="bubble ${m.mine ? "me" : ""} ${m.track ? "shared-track" : ""}">${m.track ? "♫ &nbsp;" : ""}${escapeHtml(m.text)}</div>${m.mine ? `<small class="message-receipt read">✓✓ Read</small>` : ""}</div>`).join("")}</div>
    <form class="chat-compose"><input aria-label="Message" placeholder="Message ${escapeHtml(p.name.split(" ")[0])}…"><button aria-label="Send">↑</button></form>`;
  $(".phone").appendChild(sheet);
  $("[data-close-chat]", sheet).addEventListener("click", () => { sheet.remove(); renderConversations($("#message-search").value); });
  $("[data-chat-profile]", sheet).addEventListener("click", () => { sheet.remove(); openProfile(username); });
  $(".chat-compose", sheet).addEventListener("submit", event => {
    event.preventDefault(); const input = $("input", event.currentTarget); if (!input.value.trim()) return;
    conversation.messages.push({mine:true,text:input.value.trim()});
    const stage = $(".chat-stage", sheet);
    stage.insertAdjacentHTML("beforeend", `<div class="message-row mine"><div class="bubble me">${escapeHtml(input.value.trim())}</div><small class="message-receipt sending" data-new-receipt>· Sending</small></div>`);
    setTimeout(() => {
      const receipt = $("[data-new-receipt]", sheet);
      if (receipt && receipt.classList.contains("sending")) { receipt.textContent = "✓ Delivered"; receipt.classList.remove("sending"); receipt.classList.add("delivered"); }
    }, 480);
    input.value = ""; stage.scrollTop = 99999;
    setTimeout(() => {
      if (!sheet.isConnected) return;
      stage.insertAdjacentHTML("beforeend", `<div class="typing-row" data-typing><span></span><span></span><span></span><small>${escapeHtml(p.name.split(" ")[0])} is typing</small></div>`);
      stage.scrollTop = 99999;
    }, 450);
    setTimeout(() => {
      if (!sheet.isConnected) return;
      const receipt = $("[data-new-receipt]", sheet); if (receipt) {
        const at = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        receipt.textContent = `✓✓ Read ${at}`;
        receipt.classList.remove("delivered"); receipt.classList.add("read", "receipt-pop");
        receipt.removeAttribute("data-new-receipt");
      }
      const typing = $("[data-typing]", sheet); if (typing) typing.remove();
      const replyText = conversationReply(conversation);
      conversation.messages.push({ mine:false, text: replyText });
      conversation.preview = replyText;
      conversation.time = "Now";
      stage.insertAdjacentHTML("beforeend", `<div class="message-row"><div class="bubble">${escapeHtml(replyText)}</div></div>`);
      stage.scrollTop = 99999;
    }, 2100);
  });
}

function distanceMiles(profile) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const lat1 = toRadians(CURRENT_USER.latitude);
  const lat2 = toRadians(profile.location.latitude);
  const deltaLat = toRadians(profile.location.latitude - CURRENT_USER.latitude);
  const deltaLon = toRadians(profile.location.longitude - CURRENT_USER.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radarPosition(profile) {
  const miles = distanceMiles(profile);
  const hash = [...profile.username].reduce((sum,char,index) => sum + char.charCodeAt(0) * (index + 7), 0);
  const x = 16 + (hash % 69);
  const normalized = Math.abs(x - 50) / 34;
  const arcLift = Math.sqrt(Math.max(0, 1 - normalized * normalized));
  const base = miles <= 5 ? 69 : miles <= 10 ? 67 : 65;
  const lift = miles <= 5 ? 16 : miles <= 10 ? 31 : 47;
  return {
    x,
    y: base - arcLift * lift
  };
}

function liveRadarProfiles() {
  return state.profiles
    .filter((profile) =>
      !state.severed.has(profile.username) &&
      profile.status !== "private" &&
      ["listening", "in-session"].includes(profile.status) &&
      profile.currentTrack &&
      distanceMiles(profile) <= state.radiusMiles
    )
    .sort((a, b) => compatibility(b) - compatibility(a));
}

function spreadRadarPosition(profile, index, placedPositions) {
  const position = radarPosition(profile);
  let attempt = 0;
  const overlaps = () => placedPositions.some((placed) =>
    Math.hypot(position.x - placed.x, position.y - placed.y) < 7
  );
  while (overlaps() && attempt < 10) {
    const angle = (index * 137.5 + attempt * 61) * Math.PI / 180;
    const distance = 4.5 + attempt * .65;
    position.x = Math.max(5, Math.min(95, position.x + Math.cos(angle) * distance));
    position.y = Math.max(5, Math.min(95, position.y + Math.sin(angle) * distance));
    attempt++;
  }
  placedPositions.push(position);
  return position;
}

function renderRadar() {
  const profiles = liveRadarProfiles();
  const pingLayer = $("#radar-pings");
  const placedPositions = [];
  $("#radar-live-count").textContent = `${formatApproxCount(profiles.length)} live signals`;
  $("#radar-radius-label").textContent = `within ${state.radiusMiles} miles`;
  pingLayer.innerHTML = profiles.map((profile, index) => {
    const position = spreadRadarPosition(profile, index, placedPositions);
    const match = compatibility(profile);
    const size = 17 + Math.round((match - 60) * .2) + (profile.status === "in-session" ? 4 : 0);
    const selected = state.selectedPing === profile.username;
    return `
      <button
        class="listener-ping ${profile.status} ${match >= 85 ? "close-match" : ""} ${profile.privacyMode === "knock-first" ? "knock-session" : "open-session"} ${selected ? "selected" : ""}"
        data-ping="${escapeHtml(profile.username)}"
        aria-label="${escapeHtml(profile.name)}, ${distanceMiles(profile).toFixed(1)} miles away, listening to ${escapeHtml(profile.currentTrack.name)}, ${match}% match"
        style="left:${position.x}%;top:${position.y}%;--accent:${profile.palette[0]};--ping-size:${size}px;--delay:-${(index % 6) * .35}s"
      ></button>`;
  }).join("");
  $$(".listener-ping", pingLayer).forEach((ping) => {
    ping.addEventListener("click", () => selectRadarPing(ping.dataset.ping));
  });

  if (state.selectedPing && !profiles.some((profile) => profile.username === state.selectedPing)) {
    state.selectedPing = null;
    renderRadarPreview(null);
  }
}

function selectRadarPing(username) {
  const profile = state.profiles.find(item => item.username === username);
  if (!profile) return;
  if (!state.wavelengthUnlocked.has(username)) {
    openWavelengthUnlock(profile);
    return;
  }
  state.selectedPing = state.selectedPing === username ? null : username;
  renderRadar();
  renderRadarPreview(state.selectedPing ? profile : null);
}

function openWavelengthUnlock(profile) {
  openFeatureModal(`<div class="unlock-modal">
    <div class="unlock-orbit">${avatarSpan(profile, "orbit-face")}<i></i><i></i></div>
    <p class="eyebrow">Signal locked</p><h3>Meet people beyond your orbit</h3>
    <p class="modal-copy">Wavelength keeps distance bands private. Unlock this signal with Tether Pro or watch a short demo ad.</p>
    <button class="btn primary" data-watch-unlock>Watch ad to unlock</button>
    <button class="btn" data-pro-unlock>Explore Tether Pro</button>
    <button class="modal-text-button" data-close-modal>Not now</button>
  </div>`);
  $("[data-watch-unlock]", $("#feature-modal")).addEventListener("click", event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Unlocking signal…";
    setTimeout(() => {
      state.wavelengthUnlocked.add(profile.username);
      closeFeatureModal();
      state.selectedPing = profile.username;
      renderRadar();
      renderRadarPreview(profile);
      toast(`${profile.name}'s signal unlocked.`);
    }, 900);
  });
  $("[data-pro-unlock]", $("#feature-modal")).addEventListener("click", () => toast("Tether Pro checkout is disabled in this demo."));
}

function renderRadarPreview(profile) {
  const preview = $("#radar-preview");
  if (!profile) {
    preview.innerHTML = `<p class="empty-preview">Tap a live signal to hear what Philadelphia is listening to.</p>`;
    return;
  }
  preview.innerHTML = `
    <article class="signal-card">
      <div class="signal-head">
        ${avatarSpan(profile, "avatar small")}
        <div>
          <p class="signal-name">${escapeHtml(profile.name)}</p>
          <p class="signal-meta">${distanceMiles(profile).toFixed(1)} mi away · ${titleCase(profile.privacyMode)}</p>
        </div>
        <span class="signal-match">${compatibility(profile)}%</span>
      </div>
      <p class="signal-track">${escapeHtml(profile.currentTrack.name)} · ${escapeHtml(profile.currentTrack.artist)}</p>
      <button class="btn primary signal-profile-button" data-radar-profile>View Profile</button>
    </article>`;
  $("[data-radar-profile]", preview).addEventListener("click", () => openProfile(profile.username));
}

function paletteStyle(profile) {
  const [accent = "#9BA0FA", secondary = "#242A3E"] = profile.palette;
  return `--accent:${accent};--accent-soft:${accent}33;background:linear-gradient(145deg,${accent},${secondary})`;
}


const SELF_LITE = { initials: "JR", avatarUrl: "avatars/john.roastpork.svg", palette: ["#9BA0FA", "#3E45A8"] };

function avatarSpan(profile, classes = "avatar") {
  const img = profile.avatarUrl
    ? `<img class="avatar-photo" src="${escapeHtml(profile.avatarUrl)}" alt="" loading="lazy" onerror="this.remove()">`
    : "";
  return `<span class="${classes}" style="${paletteStyle(profile)}"><b class="avatar-fallback">${escapeHtml(profile.initials || "•")}</b>${img}</span>`;
}

function artHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Original, deterministic generative cover art — every title/artist pair gets
// the same unique artwork everywhere it appears. No licensed imagery.
function coverArt(title, artist = "") {
  const seed = artHash(`${title}\u00b7${artist}`);
  const hue = seed % 360;
  const hue2 = (hue + 36 + (seed >> 4) % 48) % 360;
  const uid = (seed % 1e7).toString(36);
  const a = `hsl(${hue} 72% 58%)`;
  const b = `hsl(${hue2} 78% 42%)`;
  const deep = `hsl(${hue} 45% 12%)`;
  const glow = `hsl(${hue2} 90% 70%)`;
  const variant = seed % 4;
  const letter = (title || "?").trim().charAt(0).toLowerCase();
  let art = "";
  if (variant === 0) {
    // vinyl rings
    art = `<circle cx="60" cy="60" r="44" fill="none" stroke="${a}" stroke-width="1.4" opacity=".75"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="${glow}" stroke-width="1" opacity=".5"/>
      <circle cx="60" cy="60" r="22" fill="none" stroke="${a}" stroke-width="1.6" opacity=".85"/>
      <circle cx="60" cy="60" r="7" fill="${glow}"/>
      <path d="M18 96 A58 58 0 0 1 96 18" fill="none" stroke="${b}" stroke-width="7" opacity=".55" stroke-linecap="round"/>`;
  } else if (variant === 1) {
    // waveform bars
    const bars = Array.from({ length: 9 }, (_, i) => {
      const h = 14 + ((seed >> (i * 3)) % 52);
      return `<rect x="${14 + i * 11}" y="${60 - h / 2}" width="6" height="${h}" rx="3" fill="${i % 3 === 1 ? glow : a}" opacity="${i % 2 ? .9 : .6}"/>`;
    }).join("");
    art = `${bars}<circle cx="${20 + (seed % 80)}" cy="24" r="5" fill="${b}" opacity=".8"/>`;
  } else if (variant === 2) {
    // gel masses
    art = `<circle cx="${34 + (seed % 20)}" cy="${40 + (seed >> 3) % 18}" r="30" fill="${a}" opacity=".8"/>
      <circle cx="${74 - (seed >> 6) % 16}" cy="${72 - (seed >> 9) % 20}" r="26" fill="${b}" opacity=".78"/>
      <circle cx="66" cy="38" r="10" fill="${glow}" opacity=".9"/>`;
  } else {
    // horizon + arc
    art = `<rect x="0" y="66" width="120" height="54" fill="${b}" opacity=".85"/>
      <circle cx="60" cy="66" r="24" fill="${glow}" opacity=".95"/>
      <circle cx="60" cy="66" r="34" fill="none" stroke="${a}" stroke-width="1.4" opacity=".6"/>
      <rect x="0" y="66" width="120" height="2.5" fill="${a}"/>`;
  }
  return `<svg class="cover-art" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(title)} artwork" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cg${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${deep}"/><stop offset="1" stop-color="hsl(${hue2} 40% 8%)"/>
    </linearGradient></defs>
    <rect width="120" height="120" fill="url(#cg${uid})"/>
    ${art}
    <text x="8" y="112" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="30" fill="${a}" opacity=".28">${escapeHtml(letter)}</text>
  </svg>`;
}

function stateLabel(profile) {
  if (profile.status === "in-session") return "in session";
  if (profile.status === "listening") return "listening";
  if (profile.status === "private") return "private";
  return "offline";
}

function filteredProfiles() {
  const query = state.search.trim().toLowerCase();
  return state.profiles
    .filter((profile) => {
      if (state.severed.has(profile.username)) return false;
      if (state.filter === "live" && !["listening", "in-session"].includes(profile.status)) return false;
      if (state.filter === "sessions" && profile.status !== "in-session") return false;
      if (state.filter === "following" && !state.following.has(profile.username)) return false;
      if (!query) return true;
      return [
        profile.name,
        profile.username,
        profile.location.neighborhood,
        ...profile.topArtists
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const priority = { "in-session": 0, listening: 1, offline: 2, private: 3 };
      return priority[a.status] - priority[b.status] || compatibility(b) - compatibility(a);
    });
}

function renderProfiles() {
  const profiles = filteredProfiles();
  const list = $("#profile-list");
  list.innerHTML = profiles.length ? profiles.map((profile) => `
    <button class="profile-card" data-profile="${escapeHtml(profile.username)}">
      ${avatarSpan(profile)}
      <span class="profile-copy">
        <span class="profile-name">
          ${escapeHtml(profile.name)}
          <span class="state ${profile.status}">${stateLabel(profile)}</span>
        </span>
        <span class="profile-handle">@${escapeHtml(profile.username)} · ${escapeHtml(profile.location.neighborhood)}</span>
        ${profile.currentTrack ? `<span class="profile-track">${escapeHtml(profile.currentTrack.name)} · ${escapeHtml(profile.currentTrack.artist)}</span>` : ""}
      </span>
      <span class="profile-score">${compatibility(profile)}%</span>
    </button>
  `).join("") : `<p class="empty">No listeners match this view.</p>`;

  $$(".profile-card", list).forEach((card) => {
    card.addEventListener("click", () => openProfile(card.dataset.profile));
  });
}

function renderHome() {
  const eyebrow = $("#home-eyebrow");
  if (eyebrow) {
    const now = new Date();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const hour = now.getHours();
    const part = hour < 5 ? "late night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    eyebrow.textContent = `${weekday} ${part}`;
  }
  const live = state.profiles
    .filter(profile => ["listening","in-session"].includes(profile.status) && profile.currentTrack)
    .filter(profile => !state.severed.has(profile.username) && !state.muted.has(profile.username))
    .sort((a,b) => compatibility(b) - compatibility(a));
  const storyRail = $("#signal-story-rail");
  if (storyRail) {
    storyRail.innerHTML = `<button class="presence-person presence-self" data-story-start aria-label="Start your listening session">
      <span class="presence-avatar">${avatarSpan(SELF_LITE)}<b aria-hidden="true">+</b></span>
      <small>You</small><em>start</em>
    </button>` + live.slice(0,8).map(profile => presencePerson(profile, "home")).join("");
    $("[data-story-start]", storyRail)?.addEventListener("click", chooseOwnTrack);
  }
  $("#live-session-rail").innerHTML = live.slice(0,6).map(profile => `
    <article class="live-session-card" data-home-session="${escapeHtml(profile.username)}">
      <div class="live-session-top">
        ${avatarSpan(profile, "avatar small")}
        <div><strong>${escapeHtml(profile.name)}</strong><p>${escapeHtml(profile.location.neighborhood)} · ${titleCase(profile.privacyMode)}</p></div>
        <button class="session-cta ${profile.privacyMode === "open-door" ? "join" : "knock"}">${profile.privacyMode === "open-door" ? "Join" : "Knock"}</button>
      </div>
      <div class="mini-track"><span class="mini-art">${coverArt(profile.currentTrack.name, profile.currentTrack.artist)}</span><div><strong>${escapeHtml(profile.currentTrack.name)}</strong><p>${escapeHtml(profile.currentTrack.artist)} · synced live</p></div></div>
    </article>`).join("");
  $("#trending-session-list").innerHTML = live
    .sort((a,b) => b.metrics.sessionsHosted - a.metrics.sessionsHosted).slice(0,4)
    .map((profile,index) => `<article class="trending-session" data-home-session="${escapeHtml(profile.username)}">
      <span class="trend-rank">${index + 1}</span>
      <span class="mini-art">${coverArt(profile.currentTrack.name, profile.currentTrack.artist)}</span>
      <div><strong>${escapeHtml(profile.currentTrack.name)}</strong><p>${escapeHtml(profile.currentTrack.artist)} · session started by ${escapeHtml(profile.name)}</p></div>
      <span class="listener-count">${23 + (artHash(profile.username) % 470)} listening</span>
    </article>`).join("");
  $$("[data-home-session]").forEach(card => card.addEventListener("click", () => {
    const profile = profileByUsername(card.dataset.homeSession);
    if (profile) handlePrimaryAction(profile);
  }));
}


const REPLY_POOLS = [
  ["This is exactly the take I needed today.", "Sequencing on this is a whole journey.", "Queuing it for tonight's session.", "The restraint is what sells it, agreed."],
  ["Felt this in my chest. Instant save.", "The bridge alone deserves Platinum.", "Okay adding this to my Orbit rotation."],
  ["Exhausting is generous — but I can't stop replaying it.", "Committed to the bit and it works.", "Saw this live, review is dead on."],
  ["Grief and joy as neighbors — beautifully put.", "This retrospective sent me back to the whole catalog.", "The expansion without losing intimacy is rare."]
];

function buildReviewThreads() {
  const pool = state.profiles.filter(p => p.privacyMode !== "ghost");
  state.threads = reviews.map((review, index) => {
    const seed = artHash(review.title + review.username);
    const count = 2 + (seed % 3);
    const texts = REPLY_POOLS[index % REPLY_POOLS.length];
    return Array.from({ length: count }, (_, i) => {
      const profile = pool[(seed + i * 17) % pool.length];
      return profile.username === review.username
        ? { profile: pool[(seed + i * 17 + 5) % pool.length], text: texts[i % texts.length], when: `${4 + i * 9}m` }
        : { profile, text: texts[i % texts.length], when: `${4 + i * 9}m` };
    });
  });
}

function threadFor(sourceIndex) {
  const seeded = (state.threads && state.threads[sourceIndex]) || [];
  const mine = (state.userReplies[sourceIndex] || []).map(text => ({ profile: null, text, when: "now", mine: true }));
  return [...seeded, ...mine];
}

function shiftReviewInteractionState() {
  const shiftSet = values => new Set([...values].map(index => index + 1));
  state.openThreads = shiftSet(state.openThreads);
  state.bookmarked = shiftSet(state.bookmarked);
  state.userReplies = Object.fromEntries(
    Object.entries(state.userReplies).map(([index, replies]) => [Number(index) + 1, replies])
  );
  if (state.threads) state.threads.unshift([]);
}

function renderReviews() {
  const ranked = reviews
    .map((review, sourceIndex) => ({...review, sourceIndex, engagementScore: review.mine ? 1e9 - sourceIndex : (review.subjectRatings * review.reviewRating) / (1 + sourceIndex * .35)}))
    .filter(review => review.mine || !state.muted.has(review.username))
    .sort((a,b) => b.engagementScore - a.engagementScore);
  $("#review-feed").innerHTML = ranked.map((review,index) => {
    const profile = review.mine ? null : profileByUsername(review.username) || state.profiles[index];
    const avatar = review.mine
      ? avatarSpan(SELF_LITE, "avatar small")
      : avatarSpan(profile, "avatar small");
    const author = review.mine ? "You" : escapeHtml(profile.name);
    const coverA = review.mine ? "#9BA0FA" : profile.palette[0];
    const coverB = review.mine ? "#3E45A8" : profile.palette[2];
    const headline = review.type === "note"
      ? "posted to The Exchange"
      : `reviewed a${review.type === "artist" ? "n" : ""} ${review.type}`;
    return `<article class="review-card">
      <header class="review-head">${avatar}
        <div><strong>${author}</strong><p>${headline}${review.verified ? " · ✓ verified listen" : ""}</p></div><time>${review.time}</time></header>
      ${review.type === "note" ? "" : `<div class="review-subject"><span class="review-cover">${coverArt(review.title, review.artist)}</span>
        <div><h3>${escapeHtml(review.title)}</h3><p class="track-artist">${escapeHtml(review.artist)}</p>${review.score ? `${signalBloomStrip(review.score,true)}<small> ${review.score}/5</small>` : ""}</div></div>`}
      <p class="review-body">${escapeHtml(review.body)}</p>
      ${(() => {
        const replies = threadFor(review.sourceIndex);
        const open = state.openThreads.has(review.sourceIndex);
        const stack = replies.slice(0, 3).map(r => r.mine ? avatarSpan(SELF_LITE, "avatar micro") : avatarSpan(r.profile, "avatar micro")).join("");
        const pop = state.popKeys.has(`replies-${review.sourceIndex}`) ? " count-pop" : "";
        const meta = `${!open && replies[0] ? `<p class="thread-preview"><strong>${replies[0].mine ? "You" : escapeHtml(replies[0].profile.name.split(" ")[0])}</strong> ${escapeHtml(replies[0].text)}</p>` : ""}<button class="thread-meta" data-toggle-thread="${review.sourceIndex}" aria-expanded="${open}">
          <span class="reply-stack">${stack}</span>
          <span class="thread-counts${pop}">${replies.length} ${replies.length === 1 ? "reply" : "replies"} · ${review.subjectRatings || replies.length * 3} ratings</span>
          <span class="thread-chevron">${open ? "▾" : "▸"}</span>
        </button>`;
        if (!open) return meta;
        return meta + `<div class="thread-replies">
          ${replies.map(r => `<div class="thread-reply">${r.mine ? avatarSpan(SELF_LITE, "avatar micro") : avatarSpan(r.profile, "avatar micro")}
            <div class="thread-reply-copy"><strong>${r.mine ? "You" : escapeHtml(r.profile.name)}</strong><p>${escapeHtml(r.text)}</p><small>${escapeHtml(r.when)}</small></div></div>`).join("")}
          <form class="thread-compose" data-thread-compose="${review.sourceIndex}">
            ${avatarSpan(SELF_LITE, "avatar micro")}
            <input type="text" maxlength="200" placeholder="Add to the thread" aria-label="Reply to this post">
            <button type="submit">Send</button>
          </form>
        </div>`;
      })()}
      <footer class="review-actions">${review.mine
        ? `<button disabled>Posted just now</button><button class="bookmark ${state.bookmarked.has(review.sourceIndex) ? "saved" : ""}" data-bookmark="${review.sourceIndex}" aria-label="Save post">${state.bookmarked.has(review.sourceIndex) ? "◆ Saved" : "◇ Save"}</button>`
        : `<button data-rate-review="${review.sourceIndex}"><i class="signal-bloom inline-bloom" style="--bloom-fill:100%"><span></span></i> <span class="${state.popKeys.has(`rating-${review.sourceIndex}`) ? "count-pop" : ""}">Rate review · ${review.reviewRating}</span></button><button data-review-reply="${review.sourceIndex}">Reply</button><button data-review-session="${review.username}">Join session</button><button class="bookmark ${state.bookmarked.has(review.sourceIndex) ? "saved" : ""}" data-bookmark="${review.sourceIndex}" aria-label="Save review">${state.bookmarked.has(review.sourceIndex) ? "◆ Saved" : "◇ Save"}</button>`}</footer>
    </article>`;
  }).join("");
  state.popKeys.clear();
  $$("[data-rate-review]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.rateReview);
    const review = reviews[index];
    openReviewSlider(review, button);
  }));
  $$("[data-review-reply]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.reviewReply);
    state.openThreads.add(index);
    renderReviews();
    const composer = $(`[data-thread-compose="${index}"] input`);
    if (composer) composer.focus();
  }));
  $$("[data-toggle-thread]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.toggleThread);
    if (state.openThreads.has(index)) state.openThreads.delete(index); else state.openThreads.add(index);
    renderReviews();
  }));
  $$("[data-thread-compose]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const index = Number(form.dataset.threadCompose);
    const input = $("input", form);
    const text = input.value.trim();
    if (!text) return;
    (state.userReplies[index] = state.userReplies[index] || []).push(text);
    state.openThreads.add(index);
    state.popKeys.add(`replies-${index}`);
    renderReviews();
    if (navigator.vibrate) navigator.vibrate(6);
  }));
  $$("[data-bookmark]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.bookmark);
    const saving = !state.bookmarked.has(index);
    if (saving) state.bookmarked.add(index); else state.bookmarked.delete(index);
    button.classList.toggle("saved", saving);
    button.textContent = saving ? "◆ Saved" : "◇ Save";
    button.classList.remove("bookmark-pop"); void button.offsetWidth; button.classList.add("bookmark-pop");
    toast(saving ? "Saved to your library." : "Removed from your library.");
  }));
  $$("[data-review-session]").forEach(button => button.addEventListener("click", () => {
    const profile = profileByUsername(button.dataset.reviewSession);
    if (profile?.currentTrack) handlePrimaryAction(profile); else toast("This listening session has ended.");
  }));
}

function openReviewSlider(review, triggerButton) {
  state.reviewScore = 1;
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Rate the criticism</p><h3>Was this review useful?</h3></div><button class="icon-button" data-close-modal>×</button></div>
    <p class="modal-copy">Drag across Tether’s signal blooms. Ratings begin at one; push beyond five only for a perfect take.</p>
    <div class="star-score"><strong data-score-display>1.0</strong><span>/ 5</span></div>
    <div class="star-slider signal-rating-slider" data-star-slider role="slider" aria-label="Review rating" aria-valuemin="1" aria-valuemax="6" aria-valuenow="1">
      ${[1,2,3,4,5].map(index => `<span class="rating-bloom ${index===1?"filled":""}" data-star="${index}"><i class="signal-bloom"><span></span></i></span>`).join("")}<span class="rating-bloom platinum-star" data-star="6"><i class="signal-bloom"><span></span></i></span>
    </div>
    <p class="platinum-copy" data-platinum-copy>Drag past the edge to reveal Platinum.</p>
    <button class="btn primary" data-save-review-rating>Save rating</button>`);
  const modal = $("#feature-modal");
  const slider = $("[data-star-slider]", modal);
  const update = clientX => {
    const rect = slider.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1.12, (clientX - rect.left) / rect.width));
    const next = ratio > 1.01 ? 6 : 1 + Math.round(Math.min(1, ratio) * 8) / 2;
    const becamePlatinum = next === 6 && state.reviewScore !== 6;
    state.reviewScore = next;
    slider.classList.toggle("platinum", next === 6);
    slider.setAttribute("aria-valuenow", String(next));
    $("[data-score-display]", modal).textContent = next === 6 ? "6.0" : next.toFixed(1);
    $("[data-score-display]", modal).classList.toggle("platinum", next === 6);
    $$("[data-star]", slider).forEach((star,index) => {
      const value = index + 1;
      star.classList.toggle("filled", next >= value || (next === 6 && value === 6));
      star.classList.toggle("half", next === value - .5);
    });
    if (becamePlatinum && navigator.vibrate) navigator.vibrate(90);
  };
  slider.addEventListener("pointerdown", event => { slider.setPointerCapture(event.pointerId); update(event.clientX); });
  slider.addEventListener("pointermove", event => { if (slider.hasPointerCapture(event.pointerId)) update(event.clientX); });
  slider.tabIndex = 0;
  slider.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = state.reviewScore;
    const next = event.key === "ArrowRight"
      ? (current >= 5 ? 6 : Math.min(5, current + .5))
      : (current === 6 ? 5 : Math.max(1, current - .5));
    const rect = slider.getBoundingClientRect();
    update(rect.left + rect.width * (next === 6 ? 1.12 : (next - 1) / 4));
  });
  $("[data-save-review-rating]", modal).addEventListener("click", () => {
    const score = state.reviewScore;
    closeFeatureModal();
    triggerButton.classList.add("rated");
    triggerButton.textContent = score === 6 ? "Platinum 6.0" : `Rated ${score.toFixed(1)}`;
    state.ratedHistory.unshift({ title: review.title, score, when: "just now" });
    triggerButton.classList.remove("count-pop"); void triggerButton.offsetWidth; triggerButton.classList.add("count-pop");
    renderHistory();
    toast(score === 6 ? "Platinum rating saved." : "Review rating saved.");
  });
}

function renderExchangePanels() {
  const listeningHistory = ["Night Transit", "Soft Current", "Grace", "Let Down"];
  $("#draft-feed").innerHTML = `<article class="draft-composer">
    <p class="eyebrow">New post</p><textarea data-draft-text maxlength="280" placeholder="What are you hearing?"></textarea>
    <select data-draft-asset><option value="">Attach a track or album</option><option>Grace</option><option>Let Down</option><option>Unheard Demo Track</option></select>
    <p class="draft-validation" data-draft-validation>Select something from your listening history to review it.</p>
    <button class="btn primary" data-submit-draft disabled>Post to The Exchange</button>
  </article>`;
  const asset = $("[data-draft-asset]");
  const text = $("[data-draft-text]");
  const submit = $("[data-submit-draft]");
  const validate = () => {
    const heard = !asset.value || listeningHistory.includes(asset.value);
    submit.disabled = !text.value.trim() || !heard;
    $("[data-draft-validation]").textContent = heard ? (asset.value ? "Verified from your listening history." : "Text post · no listening verification required.") : "You need at least one stream before reviewing this.";
    $("[data-draft-validation]").classList.toggle("invalid", !heard);
  };
  asset.addEventListener("change", validate); text.addEventListener("input", validate);
  submit.addEventListener("click", () => {
    const attached = asset.value;
    const artists = { "Grace": "Jeff Buckley", "Let Down": "Radiohead" };
    shiftReviewInteractionState();
    reviews.unshift({
      mine: true,
      username: CURRENT_USER.username,
      type: attached ? "track" : "note",
      title: attached || "Note",
      artist: attached ? artists[attached] || "From your library" : "",
      score: 0,
      verified: Boolean(attached),
      body: text.value.trim(),
      subjectRatings: 0,
      reviewRating: 0,
      time: "now"
    });
    text.value = ""; asset.value = ""; validate();
    renderReviews();
    $$(".memory-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.memoryTab === "reviews"));
    $$("[data-memory-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.memoryPanel === "reviews"));
    toast("Posted to The Exchange.");
  });
  renderHistory();
}

function renderHistory() {
  const seeded = reviews
    .filter(review => !review.mine)
    .slice(0, 3)
    .map(review => ({ title: review.title, score: review.score, when: `${review.time} ago` }));
  const items = [...state.ratedHistory, ...seeded];
  $("#history-feed").innerHTML = items.map(item => `<article class="history-item">${signalBloomStrip(Math.min(item.score, 5), true)}<div><strong>${escapeHtml(item.title)}</strong><p>You rated this ${item.score === 6 ? "Platinum · 6.0" : `${item.score}/5`} · ${escapeHtml(item.when)}</p></div></article>`).join("");
}

function renderProfileTopFive() {
  const top = [
    ["Grace","Jeff Buckley",6],["Let Down","Radiohead",6],["Jubilee","Japanese Breakfast",5],
    ["Blonde","Frank Ocean",5],["Bon Iver","Bon Iver",4.5]
  ];
  $("#profile-top-five").innerHTML = top.map(([title,artist,score],index) => `<article class="top-five-item" style="--cover-a:${["#7f65d8","#4265a8","#d34f87","#d99a35","#4ca58b"][index]};--cover-b:${["#241b45","#14243f","#40162c","#4a2a08","#163b31"][index]}"><span class="top-cover">${coverArt(title, artist)}${score===6?`<i class="signal-bloom plat-badge" style="--bloom-fill:100%"><span></span></i>`:""}</span><strong>${title}</strong><small>${artist} · ${score === 6 ? "Platinum" : `${score} bloom`}</small></article>`).join("");
}

function chooseMusicService() {
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Music account</p><h3>Choose your player</h3></div><button class="icon-button" data-close-modal>×</button></div>
    <p class="modal-copy">Tether coordinates playback through your existing subscription. It never hosts or redistributes the audio.</p>
    <div class="option-list">
      ${["Spotify","Apple Music","YouTube Music"].map(name => `<button class="option-button ${state.musicService===name?"active":""}" data-music-service="${name}"><span class="service-dot ${name==="Spotify"?"spotify":name==="Apple Music"?"apple":"youtube"}"></span><span>${name}</span><span>${state.musicService===name?"Connected":"Connect"}</span></button>`).join("")}
    </div>`);
  $$("[data-music-service]",$("#feature-modal")).forEach(button => button.addEventListener("click", () => {
    state.musicService = button.dataset.musicService;
    const pill = $("[data-service-picker]"); $("strong",pill).textContent = state.musicService;
    $(".service-dot",pill).className = `service-dot ${state.musicService==="Spotify"?"spotify":state.musicService==="Apple Music"?"apple":"youtube"}`;
    closeFeatureModal(); toast(`${state.musicService} connected.`);
  }));
}

function chooseOwnTrack() {
  const tracks = [
    {name:"Night Transit",artist:"Tether Demo Library",album:"Signal Studies",durationSeconds:247,progressPercent:18},
    {name:"Soft Current",artist:"Tether Demo Library",album:"Signal Studies",durationSeconds:214,progressPercent:9},
    {name:"Afterglow Loop",artist:"Tether Demo Library",album:"Signal Studies",durationSeconds:337,progressPercent:31}
  ];
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">${state.musicService}</p><h3>Start your stage</h3></div><button class="icon-button" data-close-modal>×</button></div>
    <p class="modal-copy">Automatically starts a Tether. These original demo instrumentals stand in for playback from ${state.musicService}; the live app detects playback from your linked account.</p>
    <div class="demo-track-list">${tracks.map((track,index)=>`<article class="demo-track-row"><span class="demo-track-note">${coverArt(track.name, track.artist)}</span><div><strong>${track.name}</strong><small>${track.artist}</small></div><button data-track-preview="${index}">Preview</button><button class="start-demo-track" data-own-track="${index}">Start</button></article>`).join("")}</div>`);
  $$("[data-track-preview]",$("#feature-modal")).forEach(button => button.addEventListener("click", () => playRoyaltyFreePreview(Number(button.dataset.trackPreview), button)));
  $$("[data-own-track]",$("#feature-modal")).forEach(button => button.addEventListener("click", () => {
    const track = tracks[Number(button.dataset.ownTrack)];
    closeFeatureModal();
    startSession({name:"John Roastpork",first:"John",username:"john.roastpork",initials:"JR",palette:["#9BA0FA","#333B61","#77B7F0"],privacyMode:state.userPrivacy,status:"listening",location:{neighborhood:"Pennsport"},currentTrack:track});
  }));
}

function playRoyaltyFreePreview(index, button) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) { toast("Audio preview is unavailable in this browser."); return; }
  const context = new AudioCtx();
  const master = context.createGain();
  master.gain.setValueAtTime(.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(.12, context.currentTime + .08);
  master.gain.exponentialRampToValueAtTime(.0001, context.currentTime + 5.5);
  master.connect(context.destination);
  const patterns = [[220,277,330,415],[196,247,294,370],[174,220,261,349]];
  patterns[index].forEach((frequency,noteIndex) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = .2 / (noteIndex + 1);
    oscillator.connect(gain); gain.connect(master);
    oscillator.start(context.currentTime + noteIndex * .32);
    oscillator.stop(context.currentTime + 5.6);
  });
  button.textContent = "Playing…"; button.disabled = true;
  setTimeout(() => { if (button.isConnected) { button.textContent = "Preview"; button.disabled = false; } context.close(); }, 5600);
}

function openWavelengthOnboarding(step = 0) {
  state.wavelengthStep = step;
  const profile = state.wavelengthProfile;
  const artistStep = profile.goal === "dating" ? 3 : 2;
  const steps = profile.goal === "dating" ? 4 : 3;
  const stepNames = ["Intent", ...(profile.goal === "dating" ? ["Connection"] : []), "Taste"];
  let body = "";
  let visual = "";

  if (step === 0) {
    visual = `<div class="calibration-visual identity-signal" aria-hidden="true">
      <span class="calibration-person">JR</span><i></i><i></i><i></i>
      <b class="signal-caption">building your signal</b>
    </div>`;
    body = `<div class="onboard-step"><p class="eyebrow">Signal 01 · Identity</p><h2>Start with you.</h2>
      <p class="sub">Share only what feels useful. Height and weight are always optional and your location stays approximate.</p>
      <div class="onboard-fields"><label class="field-label">Gender
        <select class="field-control" data-onboard-gender><option value="">Skip</option>${["Man","Woman","Nonbinary","Other"].map(value=>`<option ${profile.gender===value?"selected":""}>${value}</option>`).join("")}</select></label>
        <label class="field-label" data-custom-gender-wrap style="${profile.gender==="Other"?"":"display:none"}">Your gender<input class="field-control" data-custom-gender value="${escapeHtml(profile.customGender)}" placeholder="Write your own"></label>
        <div class="optional-pair"><label class="field-label">Height · optional<input class="field-control" data-height value="${escapeHtml(profile.height)}" placeholder="5′ 10″"></label>
        <label class="field-label">Weight · optional<input class="field-control" data-weight value="${escapeHtml(profile.weight)}" placeholder="Skip"></label></div>
      </div></div>`;
  }

  if (step === 1) {
    visual = `<div class="calibration-visual intent-signal" aria-hidden="true">
      <span class="intent-node you-node">YOU</span><span class="intent-line"></span>
      <span class="intent-node match-node">${profile.goal === "dating" ? "DATE" : "FRIEND"}</span>
      <b class="signal-caption">choose where the signal leads</b>
    </div>`;
    body = `<div class="onboard-step"><p class="eyebrow">Signal 01 · Intent</p><h2>What are you hoping to find?</h2>
      <p class="sub">These are separate discovery pools. Your listening profile stays yours if you switch later.</p>
      <div class="option-grid intent-options">
        <button data-goal="friends" class="${profile.goal==="friends"?"selected":""}"><span class="option-glyph">◎</span><strong>New friends</strong><small>Find people to trade songs and share sessions with.</small></button>
        <button data-goal="dating" class="${profile.goal==="dating"?"selected":""}"><span class="option-glyph">✦</span><strong>Dating</strong><small>Discover mutual chemistry through music.</small></button>
      </div></div>`;
  }

  if (step === 2 && profile.goal === "dating") {
    visual = `<div class="calibration-visual compatibility-signal" aria-hidden="true">
      <span class="compat-orbit orbit-a"></span><span class="compat-orbit orbit-b"></span>
      <span class="compat-heart">✦</span><b class="signal-caption">mutual connection only</b>
    </div>`;
    body = `<div class="onboard-step"><p class="eyebrow">Signal 03 · Connection</p><h2>Who belongs in your orbit?</h2>
      <p class="sub">This creates mutually compatible pools before music matching. Tether never infers orientation from listening.</p>
      <div class="option-grid orientation-options">${["Straight","Gay","Bisexual","Queer / open"].map(value=>`<button data-orientation="${value}" class="${profile.orientation===value?"selected":""}">${value}</button>`).join("")}</div>
      <div class="privacy-promise"><span>◉</span><span>Your coordinates are never shown—only broad distance bands.</span></div></div>`;
  }

  if (step === artistStep) {
    visual = `<div class="calibration-visual taste-signal" aria-hidden="true">
      <span class="taste-core"><i></i><i></i><i></i><i></i><i></i></span>
      <span class="taste-tag taste-one">${escapeHtml(profile.priorityArtist || "your favorite")}</span>
      <span class="taste-tag taste-two">${escapeHtml(profile.avoidArtist || "your boundary")}</span>
      <b class="signal-caption">shaping your match field</b>
    </div>`;
    body = `<div class="onboard-step"><p class="eyebrow">Final signal · Taste</p><h2>Set your musical poles.</h2>
      <p class="sub">Prioritize a shared obsession or set a boundary. Casual plays never exclude somebody.</p>
      <div class="onboard-fields"><label class="field-label">Artist you cannot stand · optional<input class="field-control" data-avoid-artist value="${escapeHtml(profile.avoidArtist)}" placeholder="Search or skip"></label>
      <label class="field-label">Priority artist · optional<input class="field-control" data-priority-artist value="${escapeHtml(profile.priorityArtist)}" placeholder="Who do you want to bond over?"></label></div>
      <div class="artist-search-results"><button class="artist-option" data-demo-artist="Melanie Martinez" data-kind="avoid"><span>Melanie Martinez</span><small>set boundary</small></button>
      <button class="artist-option" data-demo-artist="Japanese Breakfast" data-kind="priority"><span>Japanese Breakfast</span><small>boost shared fans</small></button></div></div>`;
  }

  openFeatureModal(`<div class="wavelength-experience" data-calibration-step="${step}">
    <div class="wavelength-experience-head"><button class="journey-close" data-close-modal aria-label="Close Wavelength setup">×</button>
      <div class="journey-brand"><span class="journey-wave"><i></i><i></i><i></i></span><strong>Wavelength</strong></div>
      <span class="journey-count">${String(step).padStart(2, "0")} / ${String(steps - 1).padStart(2, "0")}</span>
    </div>
    <div class="journey-progress">${stepNames.map((name,index)=>`<span class="${index===step-1?"current":index<step-1?"complete":""}"><i></i><small>${name}</small></span>`).join("")}</div>
    <div class="journey-stage">${visual}<div class="onboarding">${body}</div></div>
    <div class="onboard-footer"><button data-onboard-back>${step<=1?"Close":"Back"}</button><button class="next" data-onboard-next>${step===steps-1?"Enter Wavelength":"Continue"}</button></div>
  </div>`);

  const modal = $("#feature-modal");
  modal.classList.add("wavelength-mode");
  $(".phone").scrollTop = 0;
  const gender = $("[data-onboard-gender]", modal);
  gender?.addEventListener("change", () => {
    profile.gender = gender.value;
    $("[data-custom-gender-wrap]", modal).style.display = gender.value === "Other" ? "grid" : "none";
  });
  $$("[data-goal]", modal).forEach(button => button.addEventListener("click", () => {
    profile.goal = button.dataset.goal;
    openWavelengthOnboarding(1);
  }));
  $$("[data-orientation]", modal).forEach(button => button.addEventListener("click", () => {
    profile.orientation = button.dataset.orientation;
    openWavelengthOnboarding(2);
  }));
  $$("[data-demo-artist]", modal).forEach(button => button.addEventListener("click", () => {
    if (button.dataset.kind === "avoid") profile.avoidArtist = button.dataset.demoArtist;
    else profile.priorityArtist = button.dataset.demoArtist;
    openWavelengthOnboarding(artistStep);
  }));
  $("[data-onboard-back]", modal).addEventListener("click", () => {
    if (step <= 1) closeFeatureModal();
    else openWavelengthOnboarding(step - 1);
  });
  $("[data-onboard-next]", modal).addEventListener("click", () => {
    if (step === 0) {
      profile.gender = gender.value;
      profile.customGender = $("[data-custom-gender]", modal)?.value || "";
      profile.height = $("[data-height]", modal).value;
      profile.weight = $("[data-weight]", modal).value;
    }
    if (step === artistStep) {
      profile.avoidArtist = $("[data-avoid-artist]", modal).value;
      profile.priorityArtist = $("[data-priority-artist]", modal).value;
    }
    if (step === steps - 1) {
      state.wavelengthReady = true;
      rebuildWavelengthQueue();
      syncWavelengthHeader();
      closeFeatureModal();
      switchView("discover", true);
      toast(`${profile.goal==="dating"?"Dating":"Friend"} Wavelength tuned.`);
    } else {
      openWavelengthOnboarding(step + 1);
    }
  });
}

function profileByUsername(username) {
  return state.profiles.find((profile) => profile.username === username);
}

function renderAnchors() {
  $("#anchor-feed").innerHTML = anchors.map((anchor) => {
    const profile = profileByUsername(anchor.username);
    if (!profile) return "";
    return `
      <article class="anchor-card">
        <div class="anchor-head">
          <div class="anchor-person">
            ${avatarSpan(profile, "avatar small")}
            <div><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(anchor.date)}</small></div>
          </div>
          ${anchor.mood ? `<span class="mood-tag">${escapeHtml(anchor.mood)}</span>` : `<span class="mood-tag">Add mood</span>`}
        </div>
        <p class="anchor-track">${escapeHtml(anchor.track)}</p>
        <p class="anchor-meta">${escapeHtml(anchor.artist)} · ${anchor.minutes} min · ${escapeHtml(anchor.distance)}</p>
        <div class="health-bar"><span style="width:${anchor.health}%"></span></div>
        ${anchor.mood ? "" : `
          <div class="mood-picker">
            ${MOODS.map((mood) => `<button data-anchor-mood="${anchor.id}" data-mood="${mood}">${mood}</button>`).join("")}
          </div>`}
      </article>`;
  }).join("");
  $$("[data-anchor-mood]").forEach((button) => button.addEventListener("click", () => {
    const anchor = anchors.find((item) => item.id === button.dataset.anchorMood);
    if (!anchor) return;
    anchor.mood = button.dataset.mood;
    renderAnchors();
    toast(`Tagged ${anchor.track} as ${anchor.mood}.`);
  }));
}

function renderCapsules() {
  $("#capsule-feed").innerHTML = capsules.map((capsule) => {
    const profile = profileByUsername(capsule.username);
    if (!profile) return "";
    const sealed = !capsule.opened;
    return `
      <article class="capsule-card ${sealed ? "sealed" : ""}">
        <div class="anchor-person">
          ${avatarSpan(profile, "avatar small")}
          <div>
            <strong>${capsule.direction === "sent" ? `Sent to ${escapeHtml(profile.name)}` : `From ${escapeHtml(profile.name)}`}</strong>
            <small>${sealed ? "Sealed moment" : "Opened moment"}</small>
          </div>
        </div>
        <p class="capsule-track">${escapeHtml(capsule.track)}</p>
        <p class="capsule-meta">${escapeHtml(capsule.artist)}</p>
        <p class="capsule-lock">${sealed ? `◒ Unlocks: ${escapeHtml(capsule.lock)}` : "✦ Ready to play"}</p>
        <button class="btn" data-capsule="${capsule.id}">${sealed ? "Check condition" : "Open moment"}</button>
      </article>`;
  }).join("");
  $$("[data-capsule]").forEach((button) => button.addEventListener("click", () => {
    const capsule = capsules.find((item) => item.id === button.dataset.capsule);
    if (!capsule) return;
    if (!capsule.opened) {
      capsule.opened = true;
      renderCapsules();
      toast(`${capsule.lock} condition simulated — capsule unlocked.`);
    } else {
      toast(`Opening ${capsule.track} at the saved moment.`);
    }
  }));
}

function sharedIdentityFor(profile) {
  const sharedArtists = profile.topArtists.filter(artist => CURRENT_USER.topArtists.includes(artist));
  const seed = artHash(`shared-${profile.username}`);
  const hours = 6 + (seed % 78);
  const moments = 2 + (seed % 17);
  const signature = sharedArtists.length
    ? `${sharedArtists[0]} is part of your common language.`
    : `Your tastes meet through ${profile.topArtists[0]} and ${CURRENT_USER.topArtists[seed % CURRENT_USER.topArtists.length]}.`;
  return { sharedArtists, hours, moments, signature, score: 68 + (seed % 30) };
}

function renderSharedIdentities() {
  const feed = $("#shared-identity-feed");
  if (!feed) return;
  const people = ["linda_331", "zuri1188", "raj_539", "james_341", "realmary", "realwilliam"]
    .map(profileByUsername)
    .filter(Boolean);
  feed.innerHTML = people.map(profile => {
    const shared = sharedIdentityFor(profile);
    return `<button class="shared-identity-card" data-shared-identity="${escapeHtml(profile.username)}" style="--identity-a:${profile.palette[0]};--identity-b:${profile.palette[2]}">
      <span class="shared-avatar-pair">${avatarSpan(SELF_LITE, "avatar small")}${avatarSpan(profile, "avatar small")}</span>
      <span class="shared-identity-copy"><strong>You + ${escapeHtml(profile.name.split(" ")[0])}</strong><small>${shared.hours}h together · ${shared.moments} anchors</small><em>${escapeHtml(shared.sharedArtists[0] || "a discovery bridge")}</em></span>
      <span class="shared-identity-score">${shared.score}%</span>
    </button>`;
  }).join("");
  $$("[data-shared-identity]", feed).forEach(button => button.addEventListener("click", () => openSharedIdentity(button.dataset.sharedIdentity)));
}

function openSharedIdentity(username) {
  const profile = profileByUsername(username);
  if (!profile) return;
  const shared = sharedIdentityFor(profile);
  const relatedAnchors = anchors.filter(anchor => anchor.username === username);
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Shared identity</p><h3>You + ${escapeHtml(profile.name)}</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <div class="shared-identity-hero" style="--identity-a:${profile.palette[0]};--identity-b:${profile.palette[2]}">
      <div class="shared-orbit">${avatarSpan(SELF_LITE, "avatar xl")}${avatarSpan(profile, "avatar xl")}<i></i></div>
      <strong>${shared.score}% shared frequency</strong>
      <p>${escapeHtml(shared.signature)}</p>
    </div>
    <div class="shared-identity-metrics"><div><strong>${shared.hours}h</strong><span>listening together</span></div><div><strong>${shared.moments}</strong><span>saved anchors</span></div><div><strong>${shared.sharedArtists.length || 3}</strong><span>artists connecting you</span></div></div>
    <div class="shared-taste"><p class="eyebrow">The sound between you</p>${(shared.sharedArtists.length ? shared.sharedArtists : [profile.topArtists[0], CURRENT_USER.topArtists[1], profile.topArtists[2]]).slice(0,3).map(artist => `<span>${escapeHtml(artist)}</span>`).join("")}</div>
    <div class="shared-memory-preview"><p class="eyebrow">A moment you share</p><strong>${escapeHtml(relatedAnchors[0]?.track || profile.currentTrack?.name || `${profile.topArtists[0]} radio`)}</strong><small>${relatedAnchors[0] ? `${relatedAnchors[0].minutes} minutes · ${relatedAnchors[0].mood}` : "Your next Tether can become an Anchor."}</small></div>
    <button class="btn primary" data-shared-message>Message ${escapeHtml(profile.name.split(" ")[0])}</button>`);
  $("[data-shared-message]", $("#feature-modal")).addEventListener("click", () => {
    closeFeatureModal();
    ensureConversation(profile);
    switchView("messages");
    openConversation(profile.username);
  });
}

function openDemoMenu() {
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Tether demo</p><h3>Choose what to preview</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <p class="modal-copy">The main demo shows an established account. You can also preview how Tether introduces itself on someone’s first day.</p>
    <div class="option-list demo-menu-list">
      <button class="option-button" data-preview-day-zero><span><strong>Preview Day Zero</strong><small>Connect music → find one person → make an Anchor</small></span><span>›</span></button>
      <button class="option-button" data-preview-language><span><strong>Learn Tether’s language</strong><small>Pulse, Anchor, Capsule, Bloom, and Platinum</small></span><span>›</span></button>
    </div>`);
  $("[data-preview-day-zero]", $("#feature-modal")).addEventListener("click", () => openDayZeroPreview(0));
  $("[data-preview-language]", $("#feature-modal")).addEventListener("click", openTermGuide);
}

function openDayZeroPreview(step = 0) {
  const steps = [
    { eyebrow:"First day · 1 of 4", title:"Bring your music.", copy:"Connect the service you already use. Tether never replaces your library—it adds people to the moment.", art:"♫", action:"Connect music" },
    { eyebrow:"First day · 2 of 4", title:"Find one person.", copy:"Invite a friend or discover someone nearby through the music you already love.", art:"◎", action:"Find someone" },
    { eyebrow:"First day · 3 of 4", title:"Press play together.", copy:"When one person starts a Tether, everyone hears the same point of the same song.", art:"≈", action:"Start your first Tether" },
    { eyebrow:"First day · 4 of 4", title:"Keep what it meant.", copy:"When the session ends, Tether saves the song, person, and feeling as your first Memory Anchor.", art:"✦", action:"See your first Anchor" }
  ];
  const item = steps[step];
  openFeatureModal(`<div class="day-zero" data-day-zero-step="${step}">
    <div class="modal-head"><div><p class="eyebrow">${item.eyebrow}</p><h3>${item.title}</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <div class="day-zero-art" aria-hidden="true"><span>${item.art}</span><i></i><i></i></div>
    <p class="modal-copy">${item.copy}</p>
    <div class="day-zero-path">${steps.map((_, index) => `<i class="${index <= step ? "active" : ""}"></i>`).join("")}</div>
    <div class="onboard-footer"><button data-day-zero-back>${step ? "Back" : "Close"}</button><button class="next" data-day-zero-next>${step === steps.length - 1 ? "Enter populated demo" : item.action}</button></div>
  </div>`);
  $("[data-day-zero-back]", $("#feature-modal")).addEventListener("click", () => step ? openDayZeroPreview(step - 1) : closeFeatureModal());
  $("[data-day-zero-next]", $("#feature-modal")).addEventListener("click", () => {
    if (step < steps.length - 1) openDayZeroPreview(step + 1);
    else {
      closeFeatureModal();
      switchView("home");
      toast("Day Zero complete · your first Anchor is waiting.");
    }
  });
}

function openTermGuide() {
  const terms = [
    ["Pulse", "A quiet, haptic way to say “I’m here with you” during a session."],
    ["Memory Anchor", "A listening moment saved with its person, song, time, and feeling."],
    ["Time Capsule", "A song sent now but opened in a meaningful future moment."],
    ["Bloom", "Tether’s five-point rating symbol for music and criticism."],
    ["Platinum", "A rare sixth Bloom reserved for something beyond a normal perfect score."]
  ];
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Tether language</p><h3>Words introduced through experience</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <div class="term-guide">${terms.map(([term, meaning], index) => `<article><span>${String(index + 1).padStart(2,"0")}</span><div><strong>${term}</strong><p>${meaning}</p></div></article>`).join("")}</div>`);
}

function openFeatureModal(content) {
  const modal = $("#feature-modal");
  if (!modal.classList.contains("open")) state.lastFocused = document.activeElement;
  modal.classList.remove("wavelength-mode");
  modal.innerHTML = `<div class="modal-sheet" role="dialog" aria-modal="true">${content}</div>`;
  modal.classList.add("open");
  $$("[data-close-modal]", modal).forEach((button) => button.addEventListener("click", closeFeatureModal));
  const firstControl = $(".modal-sheet button, .modal-sheet input, .modal-sheet select", modal);
  if (firstControl) firstControl.focus({ preventScroll: true });
}

function closeFeatureModal() {
  const modal = $("#feature-modal");
  modal.classList.remove("open", "wavelength-mode");
  modal.innerHTML = "";
  if (state.lastFocused?.isConnected) state.lastFocused.focus();
  state.lastFocused = null;
}

// One Escape press closes the topmost layer, in stacking order.
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && $("#feature-modal").classList.contains("open")) {
    const controls = $$("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", $("#feature-modal"))
      .filter(control => control.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    return;
  }
  if (event.key !== "Escape") return;
  const chatSheet = $(".chat-sheet");
  if ($("#feature-modal").classList.contains("open")) { closeFeatureModal(); return; }
  if (chatSheet) { chatSheet.remove(); renderConversations($("#message-search").value); updateUnreadBadge(); return; }
  if ($("#session-view").classList.contains("open")) { endSession(); return; }
  if ($("#profile-view").classList.contains("open")) { closeProfile(); return; }
});

// Arrow keys drive the Wavelength deck when it is on screen.
document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (state.discoverMode !== "swipe") return;
  if (!$("#discover-view").classList.contains("active")) return;
  if ($("#feature-modal").classList.contains("open") || $(".chat-sheet")) return;
  if (/input|select|textarea/i.test(document.activeElement?.tagName || "")) return;
  actOnSwipe(event.key === "ArrowRight" ? "connect" : "pass");
});

function openFriendSettings(profile) {
  const muted = state.muted.has(profile.username);
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Connection settings</p><h3>${escapeHtml(profile.name)}</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <div class="friend-actions">
      <button class="friend-action" data-mute>
        <strong>${muted ? "Unmute" : "Mute"}</strong><small>Hide their posts, sessions, and notifications.</small>
      </button>
      <button class="friend-action" data-block><strong>Block</strong><small>Remove this connection and become mutually invisible.</small></button>
      <button class="friend-action danger" data-report><strong>Report</strong><small>Send this profile to Tether safety for review.</small></button>
    </div>`);
  $("[data-mute]", $("#feature-modal")).addEventListener("click", () => confirmConnectionAction(profile, muted ? "unmute" : "mute"));
  $("[data-block]", $("#feature-modal")).addEventListener("click", () => confirmConnectionAction(profile, "block"));
  $("[data-report]", $("#feature-modal")).addEventListener("click", () => confirmConnectionAction(profile, "report"));
}

function confirmConnectionAction(profile, action) {
  openFeatureModal(`<div class="confirmation-modal"><p class="eyebrow">Confirm ${action}</p>
    <h3>Are you sure you want to ${action} ${escapeHtml(profile.name)}?</h3>
    <p class="modal-copy">${action === "block" ? "You will no longer see each other anywhere on Tether." : action === "report" ? "Tether safety will review this account." : "You can reverse this later from settings."}</p>
    <div class="confirmation-actions"><button class="confirm-yes" data-confirm-action>Yes</button><button class="confirm-cancel" data-close-modal>No / Cancel</button></div></div>`);
  $("[data-confirm-action]", $("#feature-modal")).addEventListener("click", () => {
    if (action === "mute" || action === "unmute") {
      if (action === "mute") state.muted.add(profile.username); else state.muted.delete(profile.username);
      renderHome();
      renderReviews();
    }
    if (action === "block") {
      state.severed.add(profile.username);
      state.following.delete(profile.username);
      state.conversations = state.conversations.filter(c => c.profile.username !== profile.username);
      closeProfile();
      renderProfiles();
      renderRadar();
      renderHome();
      renderReviews();
      rebuildWavelengthQueue();
      renderConversations($("#message-search")?.value || "");
    }
    closeFeatureModal();
    const result = action === "mute" ? "muted" : action === "unmute" ? "unmuted" : "blocked";
    toast(action === "report" ? `${profile.name} was reported.` : `${profile.name} ${result}.`);
  });
}

function openCapsuleComposer(profile) {
  let selectedLock = "No lock";
  const track = profile.currentTrack || {
    name: "Under Market Street",
    artist: profile.topArtists[0]
  };
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Leave a moment</p><h3>For ${escapeHtml(profile.name)}</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <p class="modal-copy">The song starts at the exact moment John chose. Add one environmental lock, or leave it open.</p>
    <section class="panel">
      <p class="track-title">${escapeHtml(track.name)}</p>
      <p class="track-artist">${escapeHtml(track.artist)} · starts at 2:36</p>
    </section>
    <div class="option-list">
      <button class="option-button active" data-lock="No lock"><span>✦</span><span>No lock</span><span>›</span></button>
      <button class="option-button" data-lock="After midnight"><span>◒</span><span>After midnight</span><span>›</span></button>
      <button class="option-button" data-lock="When it rains"><span>☂</span><span>When it rains</span><span>›</span></button>
      <button class="option-button" data-lock="On Friday"><span>□</span><span>Choose a date</span><span>›</span></button>
      <button class="option-button" data-lock="Back in Pennsport"><span>⌖</span><span>Return to this place</span><span>›</span></button>
    </div>
    <button class="btn primary" style="width:100%" data-send-capsule>Drop it →</button>`);
  $$("[data-lock]", $("#feature-modal")).forEach((button) => button.addEventListener("click", () => {
    selectedLock = button.dataset.lock;
    $$("[data-lock]", $("#feature-modal")).forEach((item) => item.classList.toggle("active", item === button));
  }));
  $("[data-send-capsule]", $("#feature-modal")).addEventListener("click", () => {
    capsules.unshift({
      id: `c${Date.now()}`,
      username: profile.username,
      track: track.name,
      artist: track.artist,
      lock: selectedLock,
      opened: selectedLock === "No lock",
      direction: "sent"
    });
    renderCapsules();
    closeFeatureModal();
    toast(`Moment left for ${profile.name}${selectedLock === "No lock" ? "." : ` · ${selectedLock}.`}`);
  });
}

function openSparkDemo() {
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Physical ritual</p><h3>Tap to Tether</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <p class="modal-copy">On a real device, John would hold phones near each other. This simulates exchanging the one-time NFC Spark token.</p>
    <div class="spark-rings"><span class="spark-icon">✦</span></div>
    <button class="btn primary" style="width:100%" data-simulate-spark>Simulate phone tap</button>`);
  $("[data-simulate-spark]", $("#feature-modal")).addEventListener("click", (event) => {
    const profile = state.profiles.find((item) => item.username === "x_patricia_x") || state.profiles[0];
    state.following.add(profile.username);
    event.currentTarget.textContent = `Connected with ${profile.name} ✦`;
    event.currentTarget.disabled = true;
    renderProfiles();
    setTimeout(closeFeatureModal, 1400);
  });
}

function openProfile(username) {
  const profile = state.profiles.find((item) => item.username === username);
  if (!profile) return;
  state.selected = profile;
  const view = $("#profile-view");
  const isFollowing = state.following.has(profile.username);
  const actionLabel = profile.status === "in-session" || profile.status === "listening"
    ? profile.privacyMode === "open-door" ? "Join session" : "Knock to join"
    : profile.status === "private" ? "Ghost mode" : "Leave a moment";
  const actionDisabled = profile.status === "private";
  const track = profile.currentTrack;
  const vibeLabels = [
    ["V", profile.vibe.valence, "valence"],
    ["E", profile.vibe.energy, "energy"],
    ["D", profile.vibe.danceability, "dance"],
    ["A", profile.vibe.acousticness, "acoustic"]
  ];
  view.style.setProperty("--accent", profile.palette[0]);
  view.style.setProperty("--accent-soft", `${profile.palette[0]}33`);
  view.innerHTML = `
    <div class="overlay-header">
      <button class="icon-button" data-close-profile aria-label="Back">‹</button>
      <button class="icon-button" data-more aria-label="More options">···</button>
    </div>
    <div class="profile-hero">
      ${avatarSpan(profile, "avatar xl")}
      <p class="eyebrow">${compatibility(profile)}% vibe match</p>
      <h2>${escapeHtml(profile.name)}</h2>
      <p class="handle">@${escapeHtml(profile.username)} · ${profile.demoAge} · ${profile.followerCount} followers</p>
      <p class="bio">${escapeHtml(wavelengthBio(profile))}</p>
      <span class="location">⌁ ${wavelengthDistanceBand(profile)} · exact location hidden</span>
      <div class="action-row">
        <button class="btn" data-follow>${isFollowing ? "Following" : "Follow"}</button>
        <button class="btn" data-message>Message</button>
        <button class="btn primary" data-session ${actionDisabled ? "disabled" : ""}>${actionLabel}</button>
      </div>
    </div>
    <div class="profile-content">
      ${track ? `
        <section class="panel">
          <p class="panel-title">Listening now</p>
          <div class="now-track">
            <div class="album-art">${coverArt(track.name, track.artist)}</div>
            <div>
              <p class="track-title">${escapeHtml(track.name)}</p>
              <p class="track-artist">${escapeHtml(track.artist)} · ${escapeHtml(track.album)}</p>
              <div class="progress"><span style="width:${track.progressPercent}%"></span></div>
            </div>
          </div>
        </section>` : `
        <section class="panel">
          <p class="panel-title">Listening status</p>
          <p class="bio">${profile.status === "private" ? "Listening privately in Ghost Mode." : "Offline right now. You can still leave a musical moment."}</p>
        </section>`}
      <section class="panel">
        <p class="panel-title">Vibe signature</p>
        <div class="vibe-row">
          ${vibeLabels.map(([letter, value, label]) => `
            <div class="vibe-item">
              <div class="vibe-ring" style="--value:${Math.round(value * 100)}%" data-label="${letter}"></div>
              <small>${label}</small>
            </div>`).join("")}
        </div>
      </section>
      <section class="panel">
        <p class="panel-title">Top artists</p>
        <div class="artists">${profile.topArtists.map((artist) => `<span class="artist-chip">${escapeHtml(artist)}</span>`).join("")}</div>
      </section>
      <section class="panel">
        <p class="panel-title">Recent sessions</p>
        <div class="recap-row"><span>${escapeHtml(track?.name || `${profile.topArtists[0]} radio`)}</span><strong>${profile.metrics.longestSharedSessionMinutes} min</strong></div>
        <div class="recap-row"><span>Late-night discovery session</span><strong>${Math.max(2, profile.metrics.sessionsJoined % 18)} friends</strong></div>
      </section>
      <section class="panel">
        <p class="panel-title">Music likes</p>
        <div class="artists"><span class="artist-chip">Album deep dives</span><span class="artist-chip">Live sessions</span><span class="artist-chip">${profile.vibe.energy > .65 ? "High energy" : "Slow burns"}</span></div>
      </section>
      <section class="panel">
        <p class="panel-title">Tether history</p>
        <div class="metric-grid">
          <div><strong>${profile.metrics.sessionsJoined}</strong><span>sessions joined</span></div>
          <div><strong>${profile.metrics.totalTetheredMinutes.toLocaleString()}</strong><span>minutes tethered</span></div>
          <div><strong>${profile.metrics.capsulesSent}</strong><span>capsules sent</span></div>
          <div><strong>${profile.metrics.memoryAnchors}</strong><span>memory anchors</span></div>
          <div><strong>${profile.metrics.longestSharedSessionMinutes}m</strong><span>longest session</span></div>
          <div><strong>${profile.metrics.listeningStreakDays}d</strong><span>listening streak</span></div>
        </div>
      </section>
      <section class="panel">
        <p class="panel-title">Connection</p>
        <div class="recap-row"><span>Privacy</span><strong>${titleCase(profile.privacyMode)}</strong></div>
        <div class="recap-row"><span>Streaming</span><strong>${escapeHtml(profile.streamingService)}</strong></div>
        <div class="recap-row"><span>Following</span><strong>${profile.followingCount}</strong></div>
        <div class="recap-row"><span>Joined Tether</span><strong>${escapeHtml(profile.dateJoined)}</strong></div>
      </section>
    </div>`;
  view.classList.add("open");
  $("[data-close-profile]", view).addEventListener("click", closeProfile);
  $("[data-more]", view).addEventListener("click", () => openFriendSettings(profile));
  $("[data-follow]", view).addEventListener("click", () => toggleFollow(profile));
  $("[data-message]", view).addEventListener("click", () => {
    closeProfile();
    ensureConversation(profile);
    openConversation(profile.username);
  });
  const sessionButton = $("[data-session]", view);
  if (!sessionButton.disabled) sessionButton.addEventListener("click", () => handlePrimaryAction(profile));
}

function closeProfile() {
  $("#profile-view").classList.remove("open");
  state.selected = null;
}

function toggleFollow(profile) {
  if (state.following.has(profile.username)) state.following.delete(profile.username);
  else state.following.add(profile.username);
  $("[data-follow]", $("#profile-view")).textContent = state.following.has(profile.username) ? "Following" : "Follow";
  renderProfiles();
  toast(state.following.has(profile.username) ? `Following ${profile.name}` : `Unfollowed ${profile.name}`);
}

function handlePrimaryAction(profile) {
  if (profile.status === "offline") {
    closeProfile();
    openCapsuleComposer(profile);
    return;
  }
  if (profile.privacyMode === "knock-first") {
    const button = $("#profile-view").classList.contains("open") ? $("[data-session]", $("#profile-view")) : $("[data-radar-profile]", $("#radar-preview"));
    if (button) {
      button.disabled = true;
      button.textContent = "Knocking…";
    }
    toast(`Knock sent to ${profile.name}`);
    setTimeout(() => startSession(profile), 900);
  } else {
    startSession(profile);
  }
}

// Session implementation.
function startSession(profile) {
  state.session = profile;
  state.sessionPaused = false;
  state.sessionStartedAt = Date.now();
  state.pulseReady = false;
  state.pulsesThisSession = 0;
  const isSelf = profile.username === CURRENT_USER.username;
  state.sessionIsSelf = isSelf;
  state.sessionGuestJoined = false;
  closeProfile();
  const view = $("#session-view");
  const track = profile.currentTrack || {
    name: `${profile.topArtists[0]} radio`,
    artist: "Live mix",
    durationSeconds: 224,
    progressPercent: 12
  };
  state.sessionTrack = {
    name: track.name,
    artist: track.artist,
    durationSeconds: track.durationSeconds,
    elapsedSeconds: track.durationSeconds * track.progressPercent / 100
  };
  const companion = isSelf ? null : state.profiles.find((item) =>
    item.username !== profile.username && item.status === "in-session" && !state.severed.has(item.username)
  );
  view.style.setProperty("--accent", profile.palette[0]);
  view.style.setProperty("--accent-soft", `${profile.palette[0]}44`);
  view.innerHTML = `
    <div class="session-stage crossfading">
      <button class="icon-button back" data-exit-session aria-label="Exit session">‹</button>
      <div class="session-person">${isSelf ? "Your Stage is live" : `Listening with ${escapeHtml(profile.name)}`} · <span data-session-timer>0:00</span></div>
      <div class="listener-stack" aria-label="Session listeners">
        ${isSelf ? "" : avatarSpan(profile)}
        ${companion ? avatarSpan(companion) : ""}
        ${avatarSpan(SELF_LITE)}
      </div>
      <div class="session-art" data-session-art>${coverArt(state.sessionTrack.name, state.sessionTrack.artist)}</div>
      <p class="session-title">${escapeHtml(state.sessionTrack.name)}</p>
      <p class="session-artist" data-session-artist>${escapeHtml(state.sessionTrack.artist)}</p>
      <div class="progress session-progress"><span data-session-progress style="width:${track.progressPercent}%"></span></div>
      <div class="session-time"><span data-session-elapsed>${formatTime(state.sessionTrack.elapsedSeconds)}</span><span data-session-remaining>-${formatTime(state.sessionTrack.durationSeconds - state.sessionTrack.elapsedSeconds)}</span></div>
      <p class="sync" data-sync-status>● synced within ${64 + Math.floor(Math.random() * 40)} ms</p>
      <p class="pause-notice" data-pause-notice></p>
      <div class="session-controls">
        ${isSelf
          ? `<button data-host-pause>Pause your stage</button><button data-track-change>Play next track</button>`
          : `<button class="demo-controls-trigger" data-session-demo-controls>Demo controls</button>`}
      </div>
      <div class="pulse-wrap">
        <button class="pulse-button" data-pulse aria-label="Hold to send pulse" ${isSelf ? "disabled" : ""}>
          <span class="pulse-fill" data-pulse-fill></span>
          <span class="pulse-symbol">✦</span>
        </button>
        <p class="pulse-label" data-pulse-label>${isSelf ? "Pulses unlock when a friend joins" : "Pulse — hold for 1.5 seconds to say “I’m here”"}</p>
        <p class="session-note" data-session-note>${isSelf ? "Friends in your Orbit can see your Stage is live." : ""}</p>
      </div>
    </div>`;
  view.classList.add("open");
  $("[data-exit-session]", view).addEventListener("click", endSession);
  $("[data-host-pause]", view)?.addEventListener("click", toggleHostPause);
  $("[data-track-change]", view)?.addEventListener("click", simulateTrackChange);
  $("[data-session-demo-controls]", view)?.addEventListener("click", () => openSessionDemoControls());
  const pulseButton = $("[data-pulse]", view);
  pulseButton.addEventListener("pointerdown", startPulseCharge);
  pulseButton.addEventListener("pointerup", releasePulseCharge);
  pulseButton.addEventListener("pointerleave", cancelPulseCharge);
  pulseButton.addEventListener("pointercancel", cancelPulseCharge);
  pulseButton.addEventListener("keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) startPulseCharge(event);
  });
  pulseButton.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") releasePulseCharge(event);
  });
  if (Date.now() < state.pulseCooldownUntil && !isSelf) beginPulseCooldownDisplay();
  clearTimeout(state.sessionJoinTimerId);
  if (isSelf) {
    // A friend discovers the live Stage a few seconds in — the payoff moment.
    const guest = state.profiles
      .filter(p => ["listening", "in-session"].includes(p.status) && !state.severed.has(p.username) && !state.muted.has(p.username))
      .sort((a, b) => compatibility(b) - compatibility(a))[0];
    if (guest) state.sessionJoinTimerId = setTimeout(() => {
      const stack = $(".listener-stack", view);
      if (!stack || !view.classList.contains("open") || !state.sessionIsSelf) return;
      state.sessionGuestJoined = true;
      stack.insertAdjacentHTML("afterbegin", avatarSpan(guest));
      const person = $(".session-person", view);
      if (person) person.innerHTML = `You + ${escapeHtml(guest.name.split(" ")[0])} · live · <span data-session-timer>${formatTime((Date.now() - state.sessionStartedAt) / 1000)}</span>`;
      const button = $("[data-pulse]", view);
      const label = $("[data-pulse-label]", view);
      if (Date.now() < state.pulseCooldownUntil) {
        beginPulseCooldownDisplay();
      } else {
        if (button) button.disabled = false;
        if (label) label.textContent = "press and hold for 1.5 seconds";
      }
      const note = $("[data-session-note]", view);
      if (note) note.textContent = "";
      toast(`${guest.name} joined your Stage ✦`);
    }, 5500);
  }
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = setInterval(() => {
    const timer = $("[data-session-timer]", view);
    if (timer) timer.textContent = formatTime((Date.now() - state.sessionStartedAt) / 1000);
    updateSessionProgress(view);
  }, 1000);
}

function openSessionDemoControls() {
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Demo controls</p><h3>Show how synchronization responds</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <p class="modal-copy">These controls simulate actions taken by the session host. They are separated from the listener experience.</p>
    <div class="option-list">
      <button class="option-button" data-demo-host-pause><span>Pause or resume the host</span><span>Ⅱ</span></button>
      <button class="option-button" data-demo-track-change><span>Change the host’s track</span><span>♫</span></button>
    </div>`);
  $("[data-demo-host-pause]", $("#feature-modal")).addEventListener("click", event => toggleHostPause(event));
  $("[data-demo-track-change]", $("#feature-modal")).addEventListener("click", event => simulateTrackChange(event));
}

function updateSessionProgress(view) {
  const track = state.sessionTrack;
  if (!track || state.sessionPaused) return;
  track.elapsedSeconds += 1;
  if (track.elapsedSeconds >= track.durationSeconds) {
    advanceSessionTrack(view);
    return;
  }
  const bar = $("[data-session-progress]", view);
  const elapsed = $("[data-session-elapsed]", view);
  const remaining = $("[data-session-remaining]", view);
  if (bar) bar.style.width = `${(track.elapsedSeconds / track.durationSeconds) * 100}%`;
  if (elapsed) elapsed.textContent = formatTime(track.elapsedSeconds);
  if (remaining) remaining.textContent = `-${formatTime(track.durationSeconds - track.elapsedSeconds)}`;
}

const SESSION_QUEUE = [
  { name: "Soft Static", artist: "Novelette", durationSeconds: 236 },
  { name: "River Lights", artist: "Marrow & Pine", durationSeconds: 211 },
  { name: "Golden Noise", artist: "Ada Winter", durationSeconds: 264 },
  { name: "Pennsport Glow", artist: "The Delaware Loop", durationSeconds: 198 }
];
let sessionQueueIndex = 0;

function advanceSessionTrack(view) {
  const next = SESSION_QUEUE[sessionQueueIndex % SESSION_QUEUE.length];
  sessionQueueIndex += 1;
  state.sessionTrack = { name: next.name, artist: next.artist, durationSeconds: next.durationSeconds, elapsedSeconds: 0 };
  const stage = $(".session-stage", view);
  if (stage) {
    stage.classList.remove("crossfading");
    void stage.offsetWidth;
    stage.classList.add("crossfading");
  }
  const title = $(".session-title", view);
  const artist = $("[data-session-artist]", view);
  const bar = $("[data-session-progress]", view);
  const elapsed = $("[data-session-elapsed]", view);
  const remaining = $("[data-session-remaining]", view);
  if (title) title.textContent = next.name;
  if (artist) artist.textContent = next.artist;
  const artBox = $("[data-session-art]", view);
  if (artBox) artBox.innerHTML = coverArt(next.name, next.artist);
  if (bar) bar.style.width = "0%";
  if (elapsed) elapsed.textContent = "0:00";
  if (remaining) remaining.textContent = `-${formatTime(next.durationSeconds)}`;
}

function endSession() {
  const profile = state.session;
  const elapsed = Math.max(1, Math.round((Date.now() - state.sessionStartedAt) / 60000));
  const isSelf = state.sessionIsSelf;
  if (!isSelf && profile && state.sessionTrack) {
    const miles = distanceMiles(profile);
    anchors.unshift({
      id: `a${Date.now()}`,
      username: profile.username,
      track: state.sessionTrack.name,
      artist: state.sessionTrack.artist,
      minutes: elapsed,
      pulses: state.pulsesThisSession,
      date: "Just now",
      mood: null,
      distance: Number.isFinite(miles) ? `${miles.toFixed(1)} miles` : "Philadelphia",
      health: 100
    });
    renderAnchors();
  }
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = null;
  clearInterval(state.pulseCooldownTimerId);
  state.pulseCooldownTimerId = null;
  clearTimeout(state.sessionJoinTimerId);
  state.sessionJoinTimerId = null;
  $("#session-view").classList.remove("open");
  state.session = null;
  state.sessionTrack = null;
  state.sessionIsSelf = false;
  state.sessionPaused = false;
  toast(isSelf ? "Your Stage went quiet." : "Session saved as a private Memory Anchor.");
}

function startPulseCharge(event) {
  event.preventDefault();
  if (!state.session || state.sessionPaused || Date.now() < state.pulseCooldownUntil) return;
  state.pulseCharging = true;
  state.pulseReady = false;
  state.pulseStartedAt = Date.now();
  const button = $("[data-pulse]");
  const fill = $("[data-pulse-fill]");
  button.classList.add("charging");
  fill.style.transition = "height 1.5s linear";
  fill.style.height = "100%";
  state.pulseChargeTimer = setTimeout(() => {
    state.pulseReady = true;
    button.classList.add("ready");
    $("[data-pulse-label]").textContent = "release to send";
  }, 1500);
}

function releasePulseCharge(event) {
  event.preventDefault();
  if (!state.pulseCharging) return;
  const heldLongEnough = state.pulseReady || Date.now() - state.pulseStartedAt >= 1500;
  clearTimeout(state.pulseChargeTimer);
  state.pulseCharging = false;
  if (heldLongEnough) firePulse();
  else {
    resetPulseCharge();
    $("[data-session-note]").textContent = "Keep holding — the Pulse should feel intentional.";
    setTimeout(() => {
      const note = $("[data-session-note]");
      if (note) note.textContent = "";
    }, 1800);
  }
}

function cancelPulseCharge() {
  if (!state.pulseCharging) return;
  clearTimeout(state.pulseChargeTimer);
  state.pulseCharging = false;
  resetPulseCharge();
}

function resetPulseCharge() {
  const button = $("[data-pulse]");
  const fill = $("[data-pulse-fill]");
  if (!button || !fill) return;
  button.classList.remove("charging", "ready");
  fill.style.transition = "height .25s ease";
  fill.style.height = "0";
  const label = $("[data-pulse-label]");
  if (label) label.textContent = "press and hold for 1.5 seconds";
}

function firePulse() {
  const button = $("[data-pulse]");
  resetPulseCharge();
  button.classList.remove("pulsing");
  void button.offsetWidth;
  button.classList.add("pulsing");
  const stage = $(".session-stage");
  const spark = document.createElement("div");
  spark.className = "pulse-spark";
  stage.appendChild(spark);
  spark.addEventListener("animationend", () => spark.remove());
  $("[data-session-note]").textContent = `Pulse sent to ${state.session.name} ✦`;
  state.pulsesThisSession += 1;
  state.pulseCooldownUntil = Date.now() + PULSE_COOLDOWN_MS;
  beginPulseCooldownDisplay();
}

// Pulses are rationed so each one stays meaningful. The demo shortens the
// production 5-minute cooldown to 45 seconds so visitors can feel the cycle.
const PULSE_COOLDOWN_MS = 45000;

function beginPulseCooldownDisplay() {
  const button = $("[data-pulse]");
  const label = $("[data-pulse-label]");
  if (!button || !label) return;
  button.disabled = true;
  button.classList.add("cooling");
  clearInterval(state.pulseCooldownTimerId);
  const tick = () => {
    const remaining = state.pulseCooldownUntil - Date.now();
    const currentButton = $("[data-pulse]");
    const currentLabel = $("[data-pulse-label]");
    if (!currentButton || !currentLabel) { clearInterval(state.pulseCooldownTimerId); return; }
    if (remaining <= 0) {
      clearInterval(state.pulseCooldownTimerId);
      state.pulseCooldownTimerId = null;
      if (state.sessionIsSelf && !state.sessionGuestJoined) {
        currentButton.classList.remove("cooling");
        currentLabel.textContent = "Pulses unlock when a friend joins";
        return;
      }
      currentButton.disabled = false;
      currentButton.classList.remove("cooling");
      currentLabel.textContent = "press and hold for 1.5 seconds";
      return;
    }
    currentLabel.textContent = `cooldown ${formatTime(remaining / 1000)} · demo-shortened from 5:00`;
  };
  tick();
  state.pulseCooldownTimerId = setInterval(tick, 1000);
}

function toggleHostPause(event) {
  state.sessionPaused = !state.sessionPaused;
  const stage = $(".session-stage");
  stage.classList.toggle("paused", state.sessionPaused);
  const who = state.sessionIsSelf ? "You" : state.session.name;
  $("[data-pause-notice]").textContent = state.sessionPaused ? `${who} paused` : "";
  $("[data-sync-status]").textContent = state.sessionPaused ? "Ⅱ host paused · playback stopped" : `● re-synced within ${58 + Math.floor(Math.random() * 40)} ms`;
  event.currentTarget.textContent = state.sessionIsSelf
    ? (state.sessionPaused ? "Resume your stage" : "Pause your stage")
    : (state.sessionPaused ? "Resume host" : "Pause host");
}

function simulateTrackChange(event) {
  if (!state.session || !state.sessionTrack) return;
  const button = event.currentTarget;
  advanceSessionTrack($("#session-view"));
  button.textContent = "Crossfaded to next track";
  setTimeout(() => {
    if (button.isConnected) button.textContent = state.sessionIsSelf ? "Play next track" : "Change host’s track";
  }, 1800);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}


const VIEW_SKELETONS = {
  discover: `<div class="sk-deck skeleton"></div><div class="sk-row"><span class="skeleton sk-pill"></span><span class="skeleton sk-pill"></span><span class="skeleton sk-pill"></span></div>`,
  activity: Array.from({length:3}, () => `<div class="sk-post"><div class="sk-line"><span class="skeleton sk-avatar"></span><span class="skeleton sk-text w40"></span></div><div class="skeleton sk-subject"></div><span class="skeleton sk-text w90"></span><span class="skeleton sk-text w70"></span></div>`).join(""),
  messages: Array.from({length:6}, () => `<div class="sk-line"><span class="skeleton sk-avatar"></span><div class="sk-stack"><span class="skeleton sk-text w50"></span><span class="skeleton sk-text w80"></span></div></div>`).join(""),
  you: `<div class="sk-line center"><span class="skeleton sk-avatar xl"></span></div><span class="skeleton sk-text w40 center"></span><div class="sk-row"><span class="skeleton sk-tile"></span><span class="skeleton sk-tile"></span><span class="skeleton sk-tile"></span></div><div class="skeleton sk-subject"></div>`
};

function showViewSkeleton(viewName) {
  const view = $(`#${viewName}-view`);
  const template = VIEW_SKELETONS[viewName];
  if (!view || !template || view.querySelector(".view-skeleton")) return;
  const overlay = document.createElement("div");
  overlay.className = "view-skeleton";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = template;
  view.prepend(overlay);
  setTimeout(() => {
    overlay.classList.add("done");
    setTimeout(() => overlay.remove(), 260);
  }, 520);
}

function switchView(viewName, bypassOnboarding = false) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  const phone = $(".phone");
  phone.dataset.scene = viewName;
  phone.scrollTop = 0;
  const activeView = $(`#${viewName}-view`);
  if (activeView) activeView.scrollTop = 0;
  activeView?.classList.remove("view-arriving");
  requestAnimationFrame(() => activeView?.classList.add("view-arriving"));
  if (!state.seenViews.has(viewName)) {
    state.seenViews.add(viewName);
    showViewSkeleton(viewName);
  }
}

function switchDiscoverMode(mode) {
  state.discoverMode = mode;
  $$(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.discoverMode === mode));
  $("#radar-panel").classList.toggle("active", mode === "radar");
  $("#swipe-panel").classList.toggle("active", mode === "swipe");
  $("#list-panel").classList.toggle("active", mode === "list");
  $("#grid-panel")?.classList.toggle("active", mode === "grid");
  if (mode === "radar") renderRadar();
  if (mode === "swipe") renderSwipeDeck();
  if (mode === "grid") renderExploreGrid();
}

function renderExploreGrid() {
  const host = $("#explore-grid");
  if (!host) return;
  const people = state.profiles
    .filter(p => p.privacyMode !== "ghost" && !state.severed.has(p.username) && isDatingCompatible(p))
    .sort((a, b) => compatibility(b) - compatibility(a))
    .slice(0, 18);
  host.innerHTML = people.map((profile, index) => {
    const track = profile.currentTrack || { name: `${profile.topArtists[0]} radio`, artist: profile.topArtists[0] };
    const live = ["listening", "in-session"].includes(profile.status);
    return `<button class="explore-tile ${index % 5 === 0 ? "tall" : ""}" data-grid-profile="${escapeHtml(profile.username)}">
      <span class="explore-cover">${coverArt(track.name, track.artist)}</span>
      <span class="explore-scrim"></span>
      ${live ? `<span class="explore-live">● live</span>` : ""}
      <span class="explore-info">${avatarSpan(profile, "avatar micro")}<span class="explore-copy"><strong>${escapeHtml(profile.name)}</strong><small>${compatibility(profile)}% · ${escapeHtml(track.artist)}</small></span></span>
    </button>`;
  }).join("");
  $$("[data-grid-profile]", host).forEach(tile => tile.addEventListener("click", () => openProfile(tile.dataset.gridProfile)));
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
}

async function init() {
  try {
    const response = await fetch("data/profiles.json?v=12");
    if (!response.ok) throw new Error(`Profile data request failed: ${response.status}`);
    const data = await response.json();
    state.profiles = data.profiles;
    const feminineNames = new Set(["Mary Garcia","Linda Mitchell","Mary Davis","Patricia Lopez","Margaret Allen","Ashley Martinez","Zuri Clark","Patricia Sanchez","Susan Hall","Kimberly Singh","Jennifer Silva","Aaliyah Gonzalez","Aaliyah Anderson","Amanda Chen","Carol Flores","Carol Harris","Amanda Hernandez","Jennifer Anderson","Elizabeth Allen"]);
    const nonbinaryNames = new Set(["Zuri King","Wei Young","Yuki Johnson"]);
    const demoOrientations = ["Straight","Bisexual","Gay","Queer / open","Straight"];
    state.profiles.forEach((profile,index) => {
      profile.demoGender = nonbinaryNames.has(profile.name) ? "Nonbinary" : feminineNames.has(profile.name) ? "Woman" : "Man";
      profile.demoOrientation = demoOrientations[index % demoOrientations.length];
      profile.demoAge = Number(profile.bio.match(/^\d+/)?.[0]) || 25;
      profile.bio = `${profile.demoAge} | ${profile.name} | ${MUSIC_BIO_PATTERNS[index % MUSIC_BIO_PATTERNS.length](profile)}`;
      profile.avatarUrl = `avatars/${AVATAR_ASSIGNMENTS[profile.username] || profile.username}.svg`;
      profile.followerCount = Math.round(28 * Math.pow(1.13, index % 24) + (index * 17) % 90);
      profile.followingCount = 18 + (index * 13) % 240;
    });
    state.following = new Set(state.profiles.slice(0, 18).map((profile) => profile.username));
    rebuildWavelengthQueue();
    buildConversations();
    $("#network-count").textContent = formatApproxCount(state.profiles.length);
    syncWavelengthHeader();
    renderProfiles();
    renderRadar();
    renderHome();
    buildReviewThreads();
    renderReviews();
    renderExchangePanels();
    renderProfileTopFive();
    renderAnchors();
    renderCapsules();
    renderSharedIdentities();
    renderSwipeDeck();
    renderConversations();
  } catch (error) {
    console.error(error);
    const message = `<div class="load-error"><strong>The Philadelphia network is unreachable.</strong>Profile data failed to load. Refresh to try again — the demo needs data/profiles.json to be served alongside it.</div>`;
    $("#live-session-rail").innerHTML = message;
    $("#trending-session-list").innerHTML = "";
    $("#profile-list").innerHTML = message;
  }
}

$("#profile-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProfiles();
});
$$(".filter").forEach((button) => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  $$(".filter").forEach((item) => item.classList.toggle("active", item === button));
  renderProfiles();
}));
$$(".mode-button").forEach((button) => button.addEventListener("click", () => {
  switchDiscoverMode(button.dataset.discoverMode);
}));
$$("[data-radius]").forEach((button) => button.addEventListener("click", () => {
  state.radiusMiles = Number(button.dataset.radius);
  $$("[data-radius]").forEach((item) => item.classList.toggle("active", item === button));
  renderRadar();
}));
$$("[data-swipe-action]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.swipeAction === "profile") {
    const profile = state.swipeQueue[state.swipeIndex];
    if (profile) openProfile(profile.username);
  } else actOnSwipe(button.dataset.swipeAction);
}));
$("#message-search").addEventListener("input", event => renderConversations(event.target.value));
$("[data-compose]").addEventListener("click", () => {
  const candidates = state.profiles
    .filter(p => !state.severed.has(p.username) && p.privacyMode !== "ghost")
    .sort((a, b) => {
      const aLive = ["listening", "in-session"].includes(a.status) ? 1 : 0;
      const bLive = ["listening", "in-session"].includes(b.status) ? 1 : 0;
      return bLive - aLive || compatibility(b) - compatibility(a);
    })
    .slice(0, 6);
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">New message</p><h3>Who are you thinking of?</h3></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div>
    <div class="option-list compose-picker">
      ${candidates.map(p => `<button class="option-button" data-compose-to="${escapeHtml(p.username)}">
        ${avatarSpan(p, "avatar small")}
        <span class="compose-copy"><strong>${escapeHtml(p.name)}</strong><small>${["listening","in-session"].includes(p.status) ? "listening now" : "recently active"} · ${compatibility(p)}% match</small></span>
        <span>›</span>
      </button>`).join("")}
    </div>`);
  $$("[data-compose-to]", $("#feature-modal")).forEach(button => button.addEventListener("click", () => {
    const profile = profileByUsername(button.dataset.composeTo);
    if (!profile) return;
    closeFeatureModal();
    ensureConversation(profile);
    openConversation(profile.username);
  }));
});
$$(".memory-tab").forEach((button) => button.addEventListener("click", () => {
  $$(".memory-tab").forEach((item) => item.classList.toggle("active", item === button));
  $$("[data-memory-panel]").forEach((panel) =>
    panel.classList.toggle("active", panel.dataset.memoryPanel === button.dataset.memoryTab)
  );
}));
$$("[data-user-privacy]").forEach((button) => button.addEventListener("click", () => {
  state.userPrivacy = button.dataset.userPrivacy;
  $$("[data-user-privacy]").forEach((item) => item.classList.toggle("active", item === button));
  const descriptions = {
    "open-door": "Friends can join without waiting. You’ll always see who arrived.",
    "knock-first": "Friends request access before their playback syncs to yours.",
    ghost: "You can listen and join others, but your own live status disappears."
  };
  $("#privacy-description").textContent = descriptions[state.userPrivacy];
  const currentPrivacy = $("#current-privacy-value");
  if (currentPrivacy) currentPrivacy.textContent = titleCase(state.userPrivacy);
  toast(`John is now in ${titleCase(state.userPrivacy)} mode.`);
}));
$("[data-demo-menu]").addEventListener("click", openDemoMenu);
$$("[data-you-memory-tab]").forEach(button => button.addEventListener("click", () => {
  $$("[data-you-memory-tab]").forEach(item => item.classList.toggle("active", item === button));
  $$("[data-you-memory-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.youMemoryPanel === button.dataset.youMemoryTab));
}));
$("[data-open-spark]")?.addEventListener("click", openSparkDemo);
$("[data-service-picker]").addEventListener("click", chooseMusicService);
$("[data-start-own-session]").addEventListener("click", chooseOwnTrack);
$("[data-wavelength-settings]").addEventListener("click", () => openWavelengthOnboarding(1));
$("[data-open-exchange-composer]").addEventListener("click", () => {
  $$(".memory-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.memoryTab === "drafts"));
  $$("[data-memory-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.memoryPanel === "drafts"));
  $("[data-draft-text]")?.focus({ preventScroll: true });
  $("[data-draft-feed]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
});
$("[data-view='activity'].profile-exchange-link").addEventListener("click", () => switchView("activity"));
$("#feature-modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeFeatureModal();
});
$$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$(".self-avatar").forEach((button) => button.addEventListener("click", () => switchView("you")));

// Make the atmosphere and controls answer the user's touch instead of looping independently.
const phone = $(".phone");
phone.dataset.scene = "home";
let touchFrame = 0;
let pendingTouch = null;
phone.addEventListener("pointermove", (event) => {
  pendingTouch = { x: event.clientX, y: event.clientY };
  if (touchFrame) return;
  touchFrame = requestAnimationFrame(() => {
    const bounds = phone.getBoundingClientRect();
    phone.style.setProperty("--touch-x", `${((pendingTouch.x - bounds.left) / bounds.width) * 100}%`);
    phone.style.setProperty("--touch-y", `${((pendingTouch.y - bounds.top) / bounds.height) * 100}%`);
    touchFrame = 0;
  });
});
document.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const bounds = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "intent-ripple";
  ripple.style.left = `${event.clientX - bounds.left}px`;
  ripple.style.top = `${event.clientY - bounds.top}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
  if (navigator.vibrate && matchMedia("(pointer: coarse)").matches) navigator.vibrate(7);
});

init();
