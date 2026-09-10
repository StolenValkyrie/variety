const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const DASHBOARD_CHANNEL_ID = "1547565813383569418";

const config = {
    title: "Variety Dashboard",

    description:
        "Manage Variety from this dashboard.",

    footer:
        "Use the buttons below to configure your server."
};

function buildDashboard() {
    const container = new ContainerBuilder()
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

        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("variety:verification")
                    .setLabel("Verification")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("variety:honeypot")
                    .setLabel("Honeypot")
                    .setStyle(ButtonStyle.Secondary)
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                config.footer
            )
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
    await interaction.reply({
        content: "The dashboard is active.",
        ephemeral: true
    });
}

module.exports = {
    execute,
    handleDashboardButton,
    buildDashboard
};