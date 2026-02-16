const https = require("https");
const cheerio = require("cheerio");

// NIT KKR's SSL certificate chain is incomplete, so we need a custom agent
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Constants ──────────────────────────────────────────────

const NITKKR_URL = "https://nitkkr.ac.in";
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
    t.includes("scholarship") ||
    t.includes("fellowship") ||
    t.includes("stipend") ||
    t.includes("merit scholarship")
  ) {
    return "Scholarship";
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
  // The NIT KKR website uses WordPress-style layout with sections
  // Announcements are listed as items with dates and titles

  // Find all elements that contain "Announcements" as a heading
  let announcementSection = null;

  $("h3, h2, h4, .widget-title, .section-title").each(function () {
    const text = $(this).text().trim();
    if (text === "Announcements" || text.includes("Announcements")) {
      // Get the parent container that holds the list
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
    // Find all list items or divs within the section that have date-title pairs
    // Try multiple selectors that might match the structure
    const itemSelectors = [
      "li",
      ".elementor-post",
      ".post-item",
      "[class*=item]",
      ".entry",
      "article",
    ];

    let items = $();

    for (const sel of itemSelectors) {
      items = announcementSection.find(sel);
      if (items.length > 3) break; // found meaningful items
    }

    if (items.length > 0) {
      items.each(function () {
        const el = $(this);
        const fullText = el.text().trim();
        const allLinks = el.find("a");

        // Try to find the date in this item
        let dateStr = null;
        let title = "";
        let link = null;

        // Check for a date match in the text
        const dateMatch = fullText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (dateMatch) {
          dateStr = parseDate(dateMatch[0]);

          // The title is usually the rest of the text after the date, or in an anchor
          if (allLinks.length > 0) {
            // Prefer the link text as title
            const mainLink = allLinks.first();
            title = cleanTitle(mainLink.text());
            link = mainLink.attr("href") || null;
          } else {
            // Remove the date from the full text to get the title
            title = cleanTitle(fullText.replace(dateMatch[0], "").trim());
          }
        }

        // Resolve relative URLs
        if (link && link.startsWith("/")) {
          link = NITKKR_URL + link;
        }

        if (dateStr && title && title.length > 5) {
          results.push({
            title,
            date: dateStr,
            link,
            category: categorize(title),
            source: "announcements",
          });
        }
      });
    }
  }

  // Strategy 2 (fallback): Use regex-based extraction on the announcements portion of HTML
  if (results.length === 0) {
    const announcementsIdx = html.indexOf("Announcements");
    const notificationsIdx = html.indexOf("Notifications");

    let sectionHtml = "";
    if (
      announcementsIdx !== -1 &&
      notificationsIdx !== -1 &&
      notificationsIdx > announcementsIdx
    ) {
      sectionHtml = html.substring(announcementsIdx, notificationsIdx);
    } else if (announcementsIdx !== -1) {
      sectionHtml = html.substring(
        announcementsIdx,
        Math.min(announcementsIdx + 50000, html.length),
      );
    }

    if (sectionHtml) {
      const $section = cheerio.load(sectionHtml);

      // Look for patterns: date elements followed by title/link elements
      // Try finding all text that looks like dates
      $section("*").each(function () {
        const el = $section(this);
        const text = el.text().trim();
        const dateMatch = text.match(/^(\w+\s+\d{1,2},?\s+\d{4})$/);

        if (dateMatch) {
          const dateStr = parseDate(dateMatch[1]);
          if (!dateStr) return;

          // Find the next sibling or following element with the title
          let titleEl = el.next();
          let title = "";
          let link = null;

          // Try a few next siblings
          for (let i = 0; i < 5 && titleEl.length > 0; i++) {
            const titleText = cleanTitle(titleEl.text());
            const anchor = titleEl.find("a").first();

            if (
              titleText &&
              titleText.length > 5 &&
              !titleText.match(/^\w+\s+\d{1,2},?\s+\d{4}$/)
            ) {
              title = titleText;
              if (anchor.length > 0) {
                title = cleanTitle(anchor.text()) || title;
                link = anchor.attr("href") || null;
              }
              break;
            }
            titleEl = titleEl.next();
          }

          if (link && link.startsWith("/")) {
            link = NITKKR_URL + link;
          }

          if (title && title.length > 5) {
            results.push({
              title,
              date: dateStr,
              link,
              category: categorize(title),
              source: "announcements",
            });
          }
        }
      });
    }
  }

  // Strategy 3 (final fallback): brute-force regex on raw HTML
  if (results.length === 0) {
    const announcementsIdx = html.indexOf("Announcements");
    let notificationsIdx = html.indexOf(
      "Notifications",
      announcementsIdx > -1 ? announcementsIdx : 0,
    );
    if (notificationsIdx === -1) notificationsIdx = html.length;

    const sectionHtml =
      announcementsIdx !== -1
        ? html.substring(announcementsIdx, notificationsIdx)
        : "";

    if (sectionHtml) {
      extractWithRegex(sectionHtml, "announcements", results);
    }
  }

  return results;
}

// ─── Parse notifications from the NIT KKR homepage using cheerio ──

function parseNotificationsFromHtml(html) {
  const results = [];
  const $ = cheerio.load(html);

  // Find the Notifications section
  let notificationSection = null;

  $("h3, h2, h4, .widget-title, .section-title").each(function () {
    const text = $(this).text().trim();
    if (
      text === "Notifications" ||
      (text.includes("Notifications") && !text.includes("Announcements"))
    ) {
      notificationSection = $(this).closest(
        "section, .widget, .elementor-widget, .elementor-section, .elementor-column, [class*=notification], [class*=widget]",
      );
      if (!notificationSection || notificationSection.length === 0) {
        notificationSection = $(this).parent().parent();
      }
      return false; // break
    }
  });

  if (notificationSection && notificationSection.length > 0) {
    const itemSelectors = [
      "li",
      ".elementor-post",
      ".post-item",
      "[class*=item]",
      ".entry",
      "article",
    ];

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

        if (link && link.startsWith("/")) {
          link = NITKKR_URL + link;
        }

        if (dateStr && title && title.length > 5) {
          results.push({
            title,
            date: dateStr,
            link,
            category: categorize(title),
            source: "notifications",
          });
        }
      });
    }
  }

  // Strategy 2 (fallback): regex on the notifications portion
  if (results.length === 0) {
    const notificationsIdx = html.lastIndexOf("Notifications");
    if (notificationsIdx !== -1) {
      const sectionHtml = html.substring(notificationsIdx);
      const $section = cheerio.load(sectionHtml);

      $section("li").each(function () {
        const el = $section(this);
        const fullText = el.text().trim();
        const anchor = el.find("a").first();

        const dateMatch = fullText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (dateMatch) {
          const dateStr = parseDate(dateMatch[0]);
          if (!dateStr) return;

          let title = "";
          let link = null;

          if (anchor.length > 0) {
            title = cleanTitle(anchor.text());
            link = anchor.attr("href") || null;
          } else {
            title = cleanTitle(fullText.replace(dateMatch[0], "").trim());
          }

          if (link && link.startsWith("/")) {
            link = NITKKR_URL + link;
          }

          if (title && title.length > 5) {
            results.push({
              title,
              date: dateStr,
              link,
              category: categorize(title),
              source: "notifications",
            });
          }
        }
      });
    }
  }

  // Strategy 3 (final fallback): brute-force regex
  if (results.length === 0) {
    // Find the last occurrence of "Notifications" heading
    const notificationsIdx = html.lastIndexOf("Notifications");
    const sectionHtml =
      notificationsIdx !== -1 ? html.substring(notificationsIdx) : "";

    if (sectionHtml) {
      extractWithRegex(sectionHtml, "notifications", results);
    }
  }

  return results;
}

// ─── Regex-based fallback extractor ─────────────────────────

function extractWithRegex(sectionHtml, source, results) {
  // Match: date followed by any tags/whitespace and then title text
  const pattern = /(\w+\s+\d{1,2},?\s+\d{4})\s*(?:<[^>]*>\s*)*([^<]{10,})/g;

  let match;
  while ((match = pattern.exec(sectionHtml)) !== null) {
    const dateStr = parseDate(match[1]);
    const rawTitle = cleanTitle(
      match[2]
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, "\u2019")
        .replace(/&#8216;/g, "\u2018")
        .replace(/&#8220;/g, "\u201C")
        .replace(/&#8221;/g, "\u201D")
        .replace(/&#8211;/g, "\u2013")
        .replace(/&#8212;/g, "\u2014")
        .replace(/&#038;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num))),
    );

    if (dateStr && rawTitle.length > 5) {
      // Try to find a link near this content
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(
        sectionHtml.length,
        match.index + match[0].length + 500,
      );
      const context = sectionHtml.substring(contextStart, contextEnd);
      const linkMatch = context.match(/href=["']([^"']+)["']/);
      let link = null;
      if (linkMatch) {
        link = linkMatch[1];
        if (link.startsWith("/")) {
          link = NITKKR_URL + link;
        }
      }

      results.push({
        title: rawTitle,
        date: dateStr,
        link,
        category: categorize(rawTitle),
        source,
      });
    }
  }
}

// ─── Deduplicate by title similarity ────────────────────────

function deduplicateItems(items) {
  const seen = new Map();

  for (const item of items) {
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 80);

    if (!key || key.length < 5) continue;

    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      // Keep the one with a link, or the one from "announcements" source
      const existing = seen.get(key);
      if (!existing.link && item.link) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}

// ─── Sort by date descending ────────────────────────────────

function sortByDateDesc(items) {
  return items.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

// ─── Main scrape function ───────────────────────────────────

async function scrapeNotifications() {
  // Return cache if fresh
  const now = Date.now();
  if (
    cachedAnnouncements &&
    cachedNotifications &&
    now - lastFetchTime < CACHE_TTL_MS
  ) {
    return {
      announcements: cachedAnnouncements,
      notifications: cachedNotifications,
      fromCache: true,
      lastFetched: new Date(lastFetchTime).toISOString(),
    };
  }

  console.log("[Scraper] Fetching NIT KKR homepage...");

  try {
    const html = await fetchPage(NITKKR_URL);
    console.log(
      `[Scraper] Fetched ${(html.length / 1024).toFixed(1)} KB of HTML`,
    );

    // Parse both sections
    const rawAnnouncements = parseAnnouncementsFromHtml(html);
    const rawNotifications = parseNotificationsFromHtml(html);

    console.log(
      `[Scraper] Raw parsed: ${rawAnnouncements.length} announcements, ${rawNotifications.length} notifications`,
    );

    // Deduplicate within each section
    const announcements = deduplicateItems(rawAnnouncements);
    const notifications = deduplicateItems(rawNotifications);

    // Sort by date descending
    sortByDateDesc(announcements);
    sortByDateDesc(notifications);

    // Add IDs
    announcements.forEach((item, i) => {
      item.id = `ann-${item.date}-${i}`;
    });
    notifications.forEach((item, i) => {
      item.id = `notif-${item.date}-${i}`;
    });

    // Cache
    cachedAnnouncements = announcements;
    cachedNotifications = notifications;
    lastFetchTime = Date.now();

    console.log(
      `[Scraper] Final: ${announcements.length} announcements, ${notifications.length} notifications`,
    );

    return {
      announcements,
      notifications,
      fromCache: false,
      lastFetched: new Date(lastFetchTime).toISOString(),
    };
  } catch (err) {
    console.error("[Scraper] Error:", err.message);

    // Return stale cache if available
    if (cachedAnnouncements || cachedNotifications) {
      console.log("[Scraper] Returning stale cache");
      return {
        announcements: cachedAnnouncements || [],
        notifications: cachedNotifications || [],
        fromCache: true,
        stale: true,
        lastFetched: lastFetchTime
          ? new Date(lastFetchTime).toISOString()
          : null,
        error: err.message,
      };
    }

    throw err;
  }
}

// ─── Get recent items (last N days) ─────────────────────────

async function getRecentNotifications(days = 30) {
  const data = await scrapeNotifications();

  const recentAnnouncements = data.announcements.filter((item) =>
    isWithinDays(item.date, days),
  );
  const recentNotifications = data.notifications.filter((item) =>
    isWithinDays(item.date, days),
  );

  // Merge and deduplicate across both sources
  const allRecent = deduplicateItems([
    ...recentAnnouncements,
    ...recentNotifications,
  ]);

  // Sort newest first
  sortByDateDesc(allRecent);

  // Re-assign IDs after merge
  allRecent.forEach((item, i) => {
    item.id = `recent-${item.date}-${i}`;
  });

  return {
    items: allRecent,
    total: allRecent.length,
    days,
    fromCache: data.fromCache,
    lastFetched: data.lastFetched,
  };
}

// ─── Get all scraped data ───────────────────────────────────

async function getAllNotifications() {
  const data = await scrapeNotifications();

  // Merge all into one sorted list
  const all = deduplicateItems([...data.announcements, ...data.notifications]);

  sortByDateDesc(all);

  all.forEach((item, i) => {
    item.id = `all-${item.date}-${i}`;
  });

  return {
    items: all,
    total: all.length,
    announcements: data.announcements,
    notifications: data.notifications,
    announcementsCount: data.announcements.length,
    notificationsCount: data.notifications.length,
    fromCache: data.fromCache,
    lastFetched: data.lastFetched,
  };
}

// ─── Invalidate cache ───────────────────────────────────────

function invalidateCache() {
  cachedAnnouncements = null;
  cachedNotifications = null;
  lastFetchTime = 0;
  console.log("[Scraper] Cache invalidated");
}

// ─── Exports ────────────────────────────────────────────────

module.exports = {
  scrapeNotifications,
  getRecentNotifications,
  getAllNotifications,
  invalidateCache,
  // Exposed for testing
  parseDate,
  isWithinDays,
  categorize,
  cleanTitle,
  deduplicateItems,
  parseAnnouncementsFromHtml,
  parseNotificationsFromHtml,
  NITKKR_URL,
};
