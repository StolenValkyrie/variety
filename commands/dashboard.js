const { SlashCommandBuilder } = require("discord.js");

const {
ContainerBuilder,
TextDisplayBuilder,
SeparatorBuilder,
SeparatorSpacingSize,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
MediaGalleryBuilder,
MediaItemBuilder,
MediaType,
MessageFlags
} = require("discord.js");

const DASHBOARD_CHANNEL_ID = "1547565813383569418";

const config = {
title: "<:vlogo:1547647295531651232> Dashboard",

description:
"Below is our rules & information.",

topBanner:
"https://cdn.phototourl.com/free/2026-09-10-ba77c95b-e86b-4d71-b693-fddc021c9dc2.png",

bottomBanner:
"https://cdn.phototourl.com/free/2026-09-10-127fedb5-ff21-4f48-8f4b-0927e9b49313.png",

rules: [
"Be respectful to everyone.",
"No spam, flooding, or excessive self-promotion.",
"No harassment, hate speech, or discrimination.",
"Keep content appropriate for the server.",
"Follow Discord's Terms of Service and Community Guidelines.",
"Listen to staff and follow channel-specific rules."
],

info:
"WIP, Open a ticket for assistance."

};

function buildDashboard() {
const container = new ContainerBuilder()

.addMediaGalleryComponents(
    new MediaGalleryBuilder().setMediaItems([
        new MediaItemBuilder()
            .setType(MediaType.Image)
            .setUrl(config.topBanner)
    ])
)

.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
        `# ${config.title}`
    )
)

.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
        config.description
    )
)

.addSeparatorComponents(
    new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
)

.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
        `## Rules\n\n${config.rules
            .map((rule, index) => `${index + 1}. ${rule}`)
            .join("\n")}`
    )
)

.addSeparatorComponents(
    new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
)

.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
        `## Information\n\n${config.info}`
    )
)

.addSeparatorComponents(
    new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
)

.addActionRowComponents(
    new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("variety:rules")
            .setLabel("Rules")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("variety:info")
            .setLabel("Info")
            .setStyle(ButtonStyle.Secondary)
    )
)

.addSeparatorComponents(
    new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
)

.addMediaGalleryComponents(
    new MediaGalleryBuilder().setMediaItems([
        new MediaItemBuilder()
            .setType(MediaType.Image)
            .setUrl(config.bottomBanner)
    ])
);

return container;

}

async function execute(message) {
const channel = await message.guild.channels.fetch(
DASHBOARD_CHANNEL_ID
);

if (!channel) {
return message.reply(
"I couldn't find the configured dashboard channel."
);
}

await channel.send({
components: [buildDashboard()],
flags: MessageFlags.IsComponentsV2
});

await message.reply(
`Dashboard sent to ${channel}.`
);

}

async function handleDashboardButton(interaction) {
if (interaction.customId === "variety:rules") {
return interaction.reply({
content: `Server Rules\n\n${config.rules
    .map((rule, index) => `${index + 1}. ${rule}`)
    .join("\n")}`,
ephemeral: true
});
}

if (interaction.customId === "variety:info") {
return interaction.reply({
content: `Server Information\n\n${config.info}`,
ephemeral: true
});
}

}

module.exports = {
execute,
handleDashboardButton,
buildDashboard
};