require("dotenv").config();

const config = require("./config");

const {
  Client,
  GatewayIntentBits,
  Collection,
  PermissionFlagsBits,
  REST,
  Routes,
  ActivityType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

console.log("ENV CHECK:", {
  GUILD_ID: config.guildId,
  CLIENT_ID: config.clientId,
  HAS_TOKEN: !!config.token
});

if (!config.guildId) {
  throw new Error("GUILD_ID is missing from .env");
}

if (!config.clientId) {
  throw new Error("CLIENT_ID is missing from .env");
}

if (!config.token) {
  throw new Error("DISCORD_TOKEN is missing from .env");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

const slashCommands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command) continue;

  const commandName = file.replace(".js", "");

  if (typeof command.execute !== "function") {
    console.warn(`Skipping "${file}" because it has no execute function.`);
    continue;
  }

  client.commands.set(commandName, command);

  if (command.data) {
    slashCommands.push(command.data.toJSON());
  }
}

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);

  console.log(`Registering ${slashCommands.length} slash command(s)...`);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: slashCommands }
  );

  console.log(`Registered ${slashCommands.length} slash command(s).`);
}

client.once("ready", async () => {
  console.log(`Variety is online as ${client.user.tag}`);

  client.user.setActivity(
    `Variety - ${client.guilds.cache.reduce(
      (total, guild) => total + guild.memberCount,
      0
    )} Members`,
    { type: ActivityType.Watching }
  );

  try {
    const guild = await client.guilds.fetch(config.guildId);

    console.log(`Connected to: ${guild.name}`);
    console.log(`Guild ID: ${guild.id}`);

    await registerSlashCommands();

    const honeypot = client.commands.get("honeypot");

    if (honeypot && typeof honeypot.setupHoneypot === "function") {
      await honeypot.setupHoneypot(guild);
      console.log("Honeypot initialized.");
    }

    console.log("Variety startup complete.");
  } catch (error) {
    console.error("Startup error:", error);
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.guild.id !== config.guildId) return;

  const honeypot = client.commands.get("honeypot");

  if (honeypot && typeof honeypot.handleMessage === "function") {
    const handledByHoneypot = await honeypot.handleMessage(message);
    if (handledByHoneypot) return;
  }

  const prefix = config.prefix;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = client.commands.get(commandName);

  if (!command) return;

  // Commands marked `public: true` skip the Manage Server gate (e.g. /support).
  // Everything else still requires Manage Server, and commands that need a
  // more specific permission (Ban Members, Kick Members, etc.) check for it
  // themselves on top of this.
  if (
    command.public !== true &&
    !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return message.reply(
      "You need the **Manage Server** permission to use this command."
    );
  }

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Command "${commandName}" failed:`, error);
    await message.reply("Something went wrong while running this command.");
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.guildId !== config.guildId) {
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) return;

      if (typeof command.executeSlash === "function") {
        await command.executeSlash(interaction);
        return;
      }

      if (typeof command.execute === "function") {
        await command.execute(interaction);
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("variety:verification")) {
        const verification = client.commands.get("verification");

        if (
          verification &&
          typeof verification.handleVerification === "function"
        ) {
          await verification.handleVerification(interaction);
        }

        return;
      }

      if (
        interaction.customId === "variety:rules" ||
        interaction.customId === "variety:info"
      ) {
        const dashboard = client.commands.get("dashboard");

        if (
          dashboard &&
          typeof dashboard.handleDashboardButton === "function"
        ) {
          await dashboard.handleDashboardButton(interaction);
        }

        return;
      }

      if (interaction.customId.startsWith("variety:ticket:")) {
        const support = client.commands.get("support");

        if (support && typeof support.handleTicketButton === "function") {
          await support.handleTicketButton(interaction);
        }

        return;
      }

      if (interaction.customId === "variety:honeypot") {
        const honeypot = client.commands.get("honeypot");

        if (
          honeypot &&
          typeof honeypot.handleHoneypotButton === "function"
        ) {
          await honeypot.handleHoneypotButton(interaction);
        }

        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "variety:ticket:rename-modal") {
        const support = client.commands.get("support");

        if (support && typeof support.submitRenameModal === "function") {
          await support.submitRenameModal(interaction);
        }

        return;
      }

      if (interaction.customId === "variety:ticket:open-modal") {
        const support = client.commands.get("support");

        if (support && typeof support.submitOpenTicketModal === "function") {
          await support.submitOpenTicketModal(interaction);
        }

        return;
      }

      if (interaction.customId.startsWith("variety:verification")) {
        const verification = client.commands.get("verification");

        if (
          verification &&
          typeof verification.handleVerification === "function"
        ) {
          await verification.handleVerification(interaction);
        }

        return;
      }
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong.",
        ephemeral: true
      });
    }
  }
});

console.log("TOKEN CHECK:", {
  exists: !!config.token,
  length: config.token.length,
  hasWhitespace: /\s/.test(config.token)
});

client.login(config.token);