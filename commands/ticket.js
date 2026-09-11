const support = require("./support");

// `!ticket <reason>` - opens a ticket the same way the button/modal does,
// just without needing to click through the panel.
async function execute(message, args) {
  await support.openTicketFromMessage(message, args);
}

module.exports = {
  execute,
  public: true // anyone can open a ticket for themselves, not just Manage Guild
};