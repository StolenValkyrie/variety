require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    PermissionFlagsBits
} = require("discord.js");

const dashboard = require("./commands/dashboard");
const honeypot = require("./commands/honeypot");
const verification = require("./commands/verification");

const GUILD_ID = process.env.GUILD_ID;

if (!GUILD_ID) {
    throw new Error("GUILD_ID is missing from .env");
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

client.commands.set("dashboard", dashboard);
client.commands.set("honeypot", honeypot);
client.commands.set("verification", verification);

client.once("ready", async () => {
    console.log(`Variety is online as ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(GUILD_ID);

        console.log(`Connected to: ${guild.name}`);
        console.log(`Guild ID: ${guild.id}`);

        // Automatically make sure the honeypot exists.
        await honeypot.setupHoneypot(guild);

        console.log("Honeypot initialized.");
        console.log("Variety startup complete.");
    } catch (error) {
        console.error("Startup error:", error);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Only operate in the configured server.
    if (message.guild.id !== GUILD_ID) return;

    // Honeypot gets priority over normal commands.
    const handledByHoneypot =
        await honeypot.handleMessage(message);

    if (handledByHoneypot) return;

    const prefix = process.env.PREFIX || "!";

    if (!message.content.startsWith(prefix)) return;

    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/\s+/);

    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);

    if (!command) return;

    // Admin-only command check.
    if (
        !message.member.permissions.has(
            PermissionFlagsBits.ManageGuild
        )
    ) {
        return message.reply(
            "You need the **Manage Server** permission to use this command."
        );
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(
            `Command "${commandName}" failed:`,
            error
        );

        await message.reply(
            "Something went wrong while running that command."
        );
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    // Only respond to buttons in the configured server.
    if (interaction.guildId !== GUILD_ID) return;

    try {
        if (
            interaction.customId ===
            "variety:verification"
        ) {
            await verification.handleVerification(
                interaction
            );
            return;
        }

        if (
            interaction.customId ===
            "variety:honeypot"
        ) {
            await honeypot.handleHoneypotButton(
                interaction
            );
            return;
        }

        if (
            interaction.customId ===
            "variety:dashboard"
        ) {
            await dashboard.handleDashboardButton(
                interaction
            );
            return;
        }
    } catch (error) {
        console.error(
            "Interaction error:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {
            await interaction.reply({
                content: "Something went wrong.",
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);