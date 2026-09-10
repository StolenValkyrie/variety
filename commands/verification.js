const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");

const VERIFICATION_CHANNEL_ID = "1547612350310252645";

const config = {
    verifiedRoleId: process.env.VERIFIED_ROLE_ID,

    apiUrl: process.env.DOCSYS_API_URL,

    apiKey: process.env.DOCSYS_API_KEY
};

function buildVerificationPanel() {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "# Verification"
            )
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "Complete the verification process to receive access to the server."
            )
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "Click the verification button to begin."
            )
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
    if (!config.apiUrl) {
        await interaction.reply({
            content:
                "Verification isn't configured yet.",
            ephemeral: true
        });

        return;
    }

    await interaction.deferReply({
        ephemeral: true
    });

    try {
        const result = await verifyWithDocsys({
            userId: interaction.user.id,
            username: interaction.user.username
        });

        if (!result.verified) {
            await interaction.editReply(
                "Verification was not completed."
            );

            return;
        }

        if (!config.verifiedRoleId) {
            await interaction.editReply(
                "Verification succeeded, but the verified role isn't configured."
            );

            return;
        }

        const member = await interaction.guild.members.fetch(
            interaction.user.id
        );

        await member.roles.add(
            config.verifiedRoleId,
            "Variety verification"
        );

        await interaction.editReply(
            "Verification successful! Your verified role has been added."
        );
    } catch (error) {
        console.error(
            "Docksys verification error:",
            error
        );

        await interaction.editReply(
            "Verification is temporarily unavailable."
        );
    }
}

async function verifyWithDocsys(user) {
    /*
     * Docksys API implementation goes here.
     *
     * We still need the official Docksys API documentation
     * to implement the request correctly.
     */

    throw new Error(
        "Docksys API request has not been configured."
    );
}

module.exports = {
    execute,
    handleVerification,
    buildVerificationPanel
};