const https = require("https");
const cheerio = require("cheerio");

// NIT KKR's SSL certificate chain is incomplete, so we need a custom agent
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Constants ──────────────────────────────────────────────

const NITKKR_URL = "https://nitkkr.ac.in";
const NOTIFICATION_SOURCES = [
  { url: "https://nitkkr.ac.in", source: "homepage" },
  { url: "https://nitkkr.ac.in/academic-notifications/", source: "academic_notices" },
  { url: "https://nitkkr.ac.in/exam-notifications/", source: "exam_notices" },
  { url: "https://nitkkr.ac.in/resultnotifications/", source: "results" },
  { url: "https://nitkkr.ac.in/exam-date-sheet/", source: "date_sheets" },
  { url: "https://nitkkr.ac.in/attendance-notices/", source: "attendance" },
  { url: "https://nitkkr.ac.in/academic-calender/", source: "academic_calendar" },
];
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── In-memory cache ────────────────────────────────────────

let cachedAnnouncements = null;
let cachedNotifications = null;
let lastFetchTime = 0;

// ─── HTTP fetch helper ──────────────────────────────────────

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : require("http");
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      agent: url.startsWith("https") ? insecureAgent : undefined,
    };

    const req = client.get(url, options, (res) => {
      // Handle redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirect = res.headers.location.startsWith("http")
          ? res.headers.location
          : `${NITKKR_URL}${res.headers.location}`;
        return fetchPage(redirect).then(resolve).catch(reject);
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
      res.on("error", reject);
    });

    req.on("error", reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

// ─── Parse date string from NIT KKR format ──────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;

  const cleaned = dateStr.replace(/\s+/g, " ").trim();

  // Formats: "February 12, 2026", "November 30, 2024", etc.
  const match = cleaned.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) return null;

  const monthNames = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

  const month = monthNames[match[1].toLowerCase()];
  if (month === undefined) return null;

  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Sanity checks
  if (day < 1 || day > 31 || year < 2000 || year > 2100) return null;

  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// ─── Check if date is within last N days ────────────────────

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;

  const date = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return date >= cutoff;
}

// ─── Categorize notification by keywords ────────────────────

function categorize(title) {
  const t = title.toLowerCase();

  if (
    t.includes("exam") ||
    t.includes("date sheet") ||
    t.includes("sessional") ||
    t.includes("reappear") ||
    t.includes("detained") ||
    t.includes("cut list")
  ) {
    return "Examination";
  }
  if (
    t.includes("result") ||
    t.includes("marks") ||
    t.includes("performance") ||
    t.includes("grade card")
  ) {
    return "Results";
  }
  if (
    t.includes("scholarship") ||
    t.includes("fellowship") ||
    t.includes("stipend") ||
    t.includes("merit scholarship")
  ) {
    return "Scholarship";
  }
  if (
    t.includes("placement") ||
    t.includes("job") ||
    t.includes("campus drive") ||
    t.includes("career") ||
    t.includes("offer")
  ) {
    return "Placements";
  }
  if (
    t.includes("recruitment") ||
    t.includes("advt") ||
    t.includes("advertisement") ||
    t.includes("walk-in") ||
    t.includes("guest faculty") ||
    t.includes("jrf") ||
    t.includes("internship") ||
    t.includes("project staff") ||
    t.includes("registrar") ||
    t.includes("research fellow") ||
    t.includes("project associate") ||
    t.includes("project associate") ||
    t.includes("research assistant") ||
    t.includes("research intern")
  ) {
    return "Recruitment";
  }
  if (
    t.includes("admission") ||
    t.includes("registration process") ||
    t.includes("counseling") ||
    t.includes("ccmt") ||
    t.includes("josaa") ||
    t.includes("dasa") ||
    t.includes("ph.d") ||
    t.includes("phd admission")
  ) {
    return "Admission";
  }
  if (
    t.includes("convocation") ||
    t.includes("alumni") ||
    t.includes("reunion") ||
    t.includes("global alumni day")
  ) {
    return "Events";
  }
  if (
    t.includes("cultural") ||
    t.includes("techfest") ||
    t.includes("confluence") ||
    t.includes("sports") ||
    t.includes("gymkhana")
  ) {
    return "Sports & Culture";
  }
  if (
    t.includes("stc") ||
    t.includes("short term course") ||
    t.includes("workshop") ||
    t.includes("fdp") ||
    t.includes("conference") ||
    t.includes("colloquium") ||
    t.includes("expert talk") ||
    t.includes("mdp") ||
    t.includes("symposium")
  ) {
    return "Academic Event";
  }
  if (
    t.includes("hostel") ||
    t.includes("mess") ||
    t.includes("ragging") ||
    t.includes("orientation") ||
    t.includes("induction") ||
    t.includes("student welfare") ||
    t.includes("student council")
  ) {
    return "Student Welfare";
  }
  if (
    t.includes("fee") ||
    t.includes("payment") ||
    t.includes("refund") ||
    t.includes("quotation") ||
    t.includes("tender") ||
    t.includes("bid") ||
    t.includes("investment of funds")
  ) {
    return "Administrative";
  }
  if (
    t.includes("timetable") ||
    t.includes("time table") ||
    t.includes("calendar") ||
    t.includes("open elective") ||
    t.includes("minor degree") ||
    t.includes("semester") ||
    t.includes("handbook") ||
    t.includes("syllabus") ||
    t.includes("academic calendar")
  ) {
    return "Academic";
  }

  return "General";
}

// ─── Normalize & clean title text ───────────────────────────

function cleanTitle(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").replace(/\n/g, " ").trim();
}

// ─── Parse announcements from the NIT KKR homepage using cheerio ──

function parseAnnouncementsFromHtml(html) {
  const results = [];
  const $ = cheerio.load(html);

  // Strategy 1: Look for the "Announcements" heading, then find its parent container
  let announcementSection = null;

  $("h3, h2, h4, .widget-title, .section-title").each(function () {
    const text = $(this).text().trim();
    if (text === "Announcements" || text.includes("Announcements")) {
      announcementSection = $(this).closest(
        "section, .widget, .elementor-widget, .elementor-section, .elementor-column, [class*=announcement], [class*=widget]",
      );
      if (!announcementSection || announcementSection.length === 0) {
        announcementSection = $(this).parent().parent();
      }
      return false; // break
    }
  });

  if (announcementSection && announcementSection.length > 0) {
    const itemSelectors = ["li", ".elementor-post", ".post-item", "[class*=item]", ".entry", "article"];
    let items = $();
    for (const sel of itemSelectors) {
      items = announcementSection.find(sel);
      if (items.length > 3) break;
    }

    if (items.length > 0) {
      items.each(function () {
        const el = $(this);
        const fullText = el.text().trim();
        const allLinks = el.find("a");

        let dateStr = null;
        let title = "";
        let link = null;

        const dateMatch = fullText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (dateMatch) {
          dateStr = parseDate(dateMatch[0]);
          if (allLinks.length > 0) {
            const mainLink = allLinks.first();
            title = cleanTitle(mainLink.text());
            link = mainLink.attr("href") || null;
          } else {
            title = cleanTitle(fullText.replace(dateMatch[0], "").trim());
          }
        }

        if (link && link.startsWith("/")) link = NITKKR_URL + link;

        if (dateStr && title && title.length > 5) {
          results.push({ title, date: dateStr, link, category: categorize(title), source: "announcements" });
        }
      });
    }
  }

  // Fallback regex extraction
  if (results.length === 0) {
    const announcementsIdx = html.indexOf("Announcements");
    if (announcementsIdx !== -1) {
      const sectionHtml = html.substring(announcementsIdx, announcementsIdx + 50000);
      extractWithRegex(sectionHtml, "announcements", results);
    }
  }

  return results;
}

// ─── Parse notifications from the NIT KKR homepage using cheerio ──

function parseNotificationsFromHtml(html) {
  const results = [];
  const $ = cheerio.load(html);

  let notificationSection = null;
  $("h3, h2, h4, .widget-title, .section-title").each(function () {
    const text = $(this).text().trim();
    if (text === "Notifications" || (text.includes("Notifications") && !text.includes("Announcements"))) {
      notificationSection = $(this).closest("section, .widget, .elementor-widget, .elementor-section, .elementor-column, [class*=notification], [class*=widget]");
      if (!notificationSection || notificationSection.length === 0) notificationSection = $(this).parent().parent();
      return false;
    }
  });

  if (notificationSection && notificationSection.length > 0) {
    const itemSelectors = ["li", ".elementor-post", ".post-item", "[class*=item]", ".entry", "article"];
    let items = $();
    for (const sel of itemSelectors) {
      items = notificationSection.find(sel);
      if (items.length > 3) break;
    }

    if (items.length > 0) {
      items.each(function () {
        const el = $(this);
        const fullText = el.text().trim();
        const allLinks = el.find("a");
        let dateStr = null;
        let title = "";
        let link = null;

        const dateMatch = fullText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (dateMatch) {
          dateStr = parseDate(dateMatch[0]);
          if (allLinks.length > 0) {
            const mainLink = allLinks.first();
            title = cleanTitle(mainLink.text());
            link = mainLink.attr("href") || null;
          } else {
            title = cleanTitle(fullText.replace(dateMatch[0], "").trim());
          }
        }
        if (link && link.startsWith("/")) link = NITKKR_URL + link;
        if (dateStr && title && title.length > 5) {
          results.push({ title, date: dateStr, link, category: categorize(title), source: "notifications" });
        }
      });
    }
  }

  if (results.length === 0) {
    const notificationsIdx = html.lastIndexOf("Notifications");
    if (notificationsIdx !== -1) extractWithRegex(html.substring(notificationsIdx), "notifications", results);
  }

  return results;
}

// ─── Regex-based fallback extractor ─────────────────────────

function extractWithRegex(sectionHtml, source, results) {
  const pattern = /(\w+\s+\d{1,2},?\s+\d{4})\s*(?:<[^>]*>\s*)*([^<]{10,})/g;
  let match;
  while ((match = pattern.exec(sectionHtml)) !== null) {
    const dateStr = parseDate(match[1]);
    const rawTitle = cleanTitle(match[2].replace(/<[^>]*>/g, ""));
    if (dateStr && rawTitle.length > 5) {
      const context = sectionHtml.substring(Math.max(0, match.index - 500), match.index + 1000);
      const linkMatch = context.match(/href=["']([^"']+)["']/);
      let link = linkMatch ? linkMatch[1] : null;
      if (link && link.startsWith("/")) link = NITKKR_URL + link;
      results.push({ title: rawTitle, date: dateStr, link, category: categorize(rawTitle), source });
    }
  }
}

// ─── Deduplicate ────────────────────────────────────────────

function deduplicateItems(items) {
  const seen = new Map();
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
    if (!key || key.length < 5) continue;
    if (!seen.has(key) || (!seen.get(key).link && item.link)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

function sortByDateDesc(items) {
  return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ─── Main scrape function ───────────────────────────────────

async function scrapeNotifications() {
  const now = Date.now();
  if (cachedAnnouncements && cachedNotifications && now - lastFetchTime < CACHE_TTL_MS) {
    return { announcements: cachedAnnouncements, notifications: cachedNotifications, fromCache: true, lastFetched: new Date(lastFetchTime).toISOString() };
  }

  try {
    const allRecords = [];
    for (const site of NOTIFICATION_SOURCES) {
      try {
        console.log(`[Scraper] Fetching ${site.source} from ${site.url}...`);
        const html = await fetchPage(site.url);
        const announcements = parseAnnouncementsFromHtml(html);
        const notifications = parseNotificationsFromHtml(html);
        announcements.forEach(item => item.source = site.source);
        notifications.forEach(item => item.source = site.source);
        allRecords.push(...announcements, ...notifications);
      } catch (err) {
        console.error(`[Scraper] Failed to fetch ${site.source}:`, err.message);
      }
    }

    const deduplicated = deduplicateItems(allRecords);
    const announcements = deduplicated.filter(item => item.source === "homepage" || item.source === "announcements");
    const notifications = deduplicated.filter(item => !announcements.includes(item));

    sortByDateDesc(announcements);
    sortByDateDesc(notifications);

    announcements.forEach((item, i) => item.id = `ann-${item.date}-${i}`);
    notifications.forEach((item, i) => item.id = `notif-${item.date}-${i}`);

    cachedAnnouncements = announcements;
    cachedNotifications = notifications;
    lastFetchTime = Date.now();

    return { announcements, notifications, fromCache: false, lastFetched: new Date(lastFetchTime).toISOString() };
  } catch (err) {
    console.error("[Scraper] Main error:", err.message);
    if (cachedAnnouncements) return { announcements: cachedAnnouncements, notifications: cachedNotifications, fromCache: true, stale: true, error: err.message };
    throw err;
  }
}

async function getRecentNotifications(days = 30) {
  const data = await scrapeNotifications();
  const allRecent = deduplicateItems([...data.announcements, ...data.notifications]).filter(item => isWithinDays(item.date, days));
  sortByDateDesc(allRecent);
  allRecent.forEach((item, i) => item.id = `recent-${item.date}-${i}`);
  return { items: allRecent, total: allRecent.length, days, fromCache: data.fromCache, lastFetched: data.lastFetched };
}

async function getAllNotifications() {
  const data = await scrapeNotifications();
  const all = deduplicateItems([...data.announcements, ...data.notifications]);
  sortByDateDesc(all);
  all.forEach((item, i) => item.id = `all-${item.date}-${i}`);
  return { items: all, total: all.length, announcements: data.announcements, notifications: data.notifications, fromCache: data.fromCache, lastFetched: data.lastFetched };
}

function invalidateCache() {
  cachedAnnouncements = null;
  cachedNotifications = null;
  lastFetchTime = 0;
}

module.exports = {
  scrapeNotifications,
  getRecentNotifications,
  getAllNotifications,
  invalidateCache,
  parseDate,
  isWithinDays,
  categorize,
  cleanTitle,
  deduplicateItems,
  parseAnnouncementsFromHtml,
  parseNotificationsFromHtml,
  NITKKR_URL,
};
