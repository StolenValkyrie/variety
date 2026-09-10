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

const VERIFICATION_CHANNEL_ID = "1547612350310252645";
const GUILD_ID = process.env.GUILD_ID;

const config = {
verifiedRoleId: process.env.VERIFIED_ROLE_ID,

apiUrl: "https://api.docksys.xyz",

apiKey: process.env.DOCK_API_KEY,

topBanner:
    "https://cdn.phototourl.com/free/2026-09-10-ba77c95b-e86b-4d71-b693-fddc021c9dc2.png",

bottomBanner:
    "https://cdn.phototourl.com/free/2026-09-10-127fedb5-ff21-4f48-8f4b-0927e9b49313.png"

};

function buildVerificationPanel() {
return new ContainerBuilder()

    .addMediaGalleryComponents(
        new MediaGalleryBuilder().setMediaItems([
            new MediaItemBuilder()
                .setType(MediaType.Image)
                .setUrl(config.topBanner)
        ])
    )

    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "# <:vlogo:1547647295531651232> Verification"
        )
    )

    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "Verify your roblox account with your discord."
        )
    )

    .addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
    )

    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "Click the button below to check your verification status."
        )
    )

    .addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("variety:verification")
                .setLabel("Verify")
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

}

async function execute(message) {
const channel = await message.guild.channels.fetch(
VERIFICATION_CHANNEL_ID
);

if (!channel) {
    return message.reply(
        "I couldn't find the configured verification channel."
    );
}

await channel.send({
    components: [buildVerificationPanel()],
    flags: MessageFlags.IsComponentsV2
});

await message.reply(
    `Verification panel sent to ${channel}.`
);

}

async function handleVerification(interaction) {
if (!config.apiKey) {
return interaction.reply({
content:
"Verification isn't configured yet. The Dock API key is missing.",
ephemeral: true
});
}

if (!config.verifiedRoleId) {
    return interaction.reply({
        content:
            "Verification isn't configured yet. The verified role is missing.",
        ephemeral: true
    });
}

await interaction.deferReply({
    ephemeral: true
});

try {
    const result = await verifyWithDock({
        discordId: interaction.user.id,
        guildId: interaction.guild.id
    });

    if (!result.verified) {
        await interaction.editReply(
            "You are not verified with Dock yet. Please link your Roblox account with Dock first, then try again."
        );

        return;
    }

    const member = await interaction.guild.members.fetch(
        interaction.user.id
    );

    if (member.roles.cache.has(config.verifiedRoleId)) {
        await interaction.editReply(
            "You are already verified."
        );

        return;
    }

    await member.roles.add(
        config.verifiedRoleId,
        "Variety verification"
    );

    await interaction.editReply(
        "Verification successful! Your verified role has been added."
    );

} catch (error) {
    console.error(
        "Dock verification error:",
        error
    );

    await interaction.editReply(
        "Verification is temporarily unavailable. Please try again later."
    );
}

}

async function verifyWithDock({
discordId,
guildId
}) {
const url = new URL(
"/api/v1/public/discord-to-roblox",
config.apiUrl
);

url.searchParams.set(
    "discordId",
    discordId
);

url.searchParams.set(
    "guildId",
    guildId
);

const response = await fetch(
    url.toString(),
    {
        method: "GET",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json"
        }
    }
);

let data;

try {
    data = await response.json();
} catch {
    throw new Error(
        `Dock returned an invalid response. HTTP ${response.status}`
    );
}

if (!response.ok) {
    throw new Error(
        `Dock API error ${response.status}: ${JSON.stringify(data)}`
    );
}

const robloxId =
    data?.data?.robloxId ??
    data?.robloxId ??
    data?.resolved?.id;

return {
    verified: Boolean(robloxId),
    robloxId: robloxId ?? null,
    data
};

}

module.exports = {
execute,
handleVerification,
buildVerificationPanel
};