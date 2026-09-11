// Single source of truth for all bot configuration.
// Everything here is pulled from .env — nothing is hardcoded, so you only
// ever have to change values in one place.

module.exports = {
  guildId: process.env.GUILD_ID,
  clientId: process.env.CLIENT_ID,
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.PREFIX || "!",

  verifiedRoleId: process.env.VERIFIED_ROLE_ID,
  dashboardChannelId: process.env.DASHBOARD_CHANNEL_ID,
  verificationChannelId: process.env.VERIFICATION_CHANNEL_ID,
  supportChannelId: process.env.SUPPORT_CHANNEL_ID || null,

  dock: {
    apiUrl: "https://api.docksys.xyz",
    apiKey: process.env.DOCK_API_KEY
  },

  honeypot: {
    channelName: "do-not-talk",
    logChannelName: "mod-logs",
    warningTitle: "Do Not Talk",
    warningText: "This channel is intended to catch bots/spam accounts.",
    deleteMessageSeconds: 86400
  },

  banners: {
    top: "https://cdn.phototourl.com/free/2026-09-10-ba77c95b-e86b-4d71-b693-fddc021c9dc2.png",
    bottom: "https://cdn.phototourl.com/free/2026-09-10-127fedb5-ff21-4f48-8f4b-0927e9b49313.png"
  },

  support: {
    // Channel the ticket panel gets posted to (override with
    // SUPPORT_PANEL_CHANNEL_ID in .env if you ever need to change it).
    panelChannelId: process.env.SUPPORT_PANEL_CHANNEL_ID || "1547566142091173999",

    // Optional: role that counts as "staff" for claim/rename/close/unclaim.
    // If unset, anyone with Manage Server counts as staff instead.
    staffRoleId: process.env.SUPPORT_STAFF_ROLE_ID || null,

    // Optional: category new ticket channels get created under.
    // If unset, tickets are created at the top level of the server.
    ticketCategoryId: process.env.SUPPORT_TICKET_CATEGORY_ID || null
  }
};