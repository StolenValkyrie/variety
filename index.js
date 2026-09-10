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

const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

if (!GUILD_ID) {
throw new Error("GUILD_ID is missing from .env");
}

if (!CLIENT_ID) {
throw new Error("CLIENT_ID is missing from .env");
}

if (!TOKEN) {
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
    console.warn(
        `Skipping "${file}" because it has no execute function.`
    );

    continue;
}

client.commands.set(commandName, command);

if (command.data) {
    slashCommands.push(
        command.data.toJSON()
    );
}

}

async function registerSlashCommands() {
const rest = new REST({
version: "10"
}).setToken(TOKEN);

console.log(
    `Registering ${slashCommands.length} slash command(s)...`
);

await rest.put(
    Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
    ),
    {
        body: slashCommands
    }
);

console.log(
    `Registered ${slashCommands.length} slash command(s).`
);

}

client.once("ready", async () => {
console.log(
`Variety is online as ${client.user.tag}`
);

client.user.setActivity(
    `Variety - ${client.guilds.cache.reduce(
        (total, guild) => total + guild.memberCount,
        0
    )} Members`,
    {
        type: ActivityType.Watching
    }
);

try {
    const guild = await client.guilds.fetch(
        GUILD_ID
    );

    console.log(
        `Connected to: ${guild.name}`
    );

    console.log(
        `Guild ID: ${guild.id}`
    );

    await registerSlashCommands();

    const honeypot = client.commands.get(
        "honeypot"
    );

    if (
        honeypot &&
        typeof honeypot.setupHoneypot === "function"
    ) {
        await honeypot.setupHoneypot(guild);

        console.log(
            "Honeypot initialized."
        );
    }

    console.log(
        "Variety startup complete."
    );

} catch (error) {
    console.error(
        "Startup error:",
        error
    );
}

});

client.on("messageCreate", async (message) => {
if (message.author.bot) return;
if (!message.guild) return;

if (message.guild.id !== GUILD_ID) return;

const honeypot = client.commands.get(
    "honeypot"
);

if (
    honeypot &&
    typeof honeypot.handleMessage === "function"
) {
    const handledByHoneypot =
        await honeypot.handleMessage(message);

    if (handledByHoneypot) return;
}

const prefix =
    process.env.PREFIX || "!";

if (!message.content.startsWith(prefix)) return;

const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

const commandName =
    args.shift()?.toLowerCase();

if (!commandName) return;

const command =
    client.commands.get(commandName);

if (!command) return;

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
    await command.execute(
        message,
        args
    );
} catch (error) {
    console.error(
        `Command "${commandName}" failed:`,
        error
    );

    await message.reply(
        "Something went wrong while running this command."
    );
}

});

client.on("interactionCreate", async (interaction) => {
if (interaction.guildId !== GUILD_ID) {
return;
}

try {
    if (interaction.isChatInputCommand()) {
        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) return;

        if (
            typeof command.executeSlash ===
            "function"
        ) {
            await command.executeSlash(
                interaction
            );

            return;
        }

        if (
            typeof command.execute ===
            "function"
        ) {
            await command.execute(
                interaction
            );

            return;
        }

        return;
    }

    if (interaction.isButton()) {
        if (
            interaction.customId ===
            "variety:verification"
        ) {
            const verification =
                client.commands.get(
                    "verification"
                );

            if (
                verification &&
                typeof verification.handleVerification ===
                "function"
            ) {
                await verification.handleVerification(
                    interaction
                );
            }

            return;
        }

        if (
            interaction.customId ===
                "variety:rules" ||
            interaction.customId ===
                "variety:info"
        ) {
            const dashboard =
                client.commands.get(
                    "dashboard"
                );

            if (
                dashboard &&
                typeof dashboard.handleDashboardButton ===
                "function"
            ) {
                await dashboard.handleDashboardButton(
                    interaction
                );
            }

            return;
        }

        if (
            interaction.customId ===
            "variety:honeypot"
        ) {
            const honeypot =
                client.commands.get(
                    "honeypot"
                );

            if (
                honeypot &&
                typeof honeypot.handleHoneypotButton ===
                "function"
            ) {
                await honeypot.handleHoneypotButton(
                    interaction
                );
            }

            return;
        }
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
            content:
                "Something went wrong.",
            ephemeral: true
        });
    }
}

});

console.log(
"TOKEN CHECK:",
{
exists: !!TOKEN,
length: TOKEN.length,
hasWhitespace: /\s/.test(TOKEN)
}
);

client.login(TOKEN);