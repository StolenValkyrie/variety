const config = require("../config");

async function resolveMember(message, arg) {
  const mentioned = message.mentions.members?.first();
  if (mentioned) return mentioned;

  const idMatch = /^(?:<@!?)?(\d+)>?$/.exec(arg);
  if (!idMatch) return null;

  return message.guild.members
    .fetch(idMatch[1])
    .catch(() => null);
}

function resolveRole(guild, arg) {
  const idMatch = /^(?:<@&)?(\d+)>?$/.exec(arg);

  if (idMatch) {
    const role = guild.roles.cache.get(idMatch[1]);
    if (role) return role;
  }

  return (
    guild.roles.cache.find(
      role => role.name.toLowerCase() === arg.toLowerCase()
    ) || null
  );
}

// `!role <user> <role(s)>` - e.g. `!role @Sam Member "VIP"` or
// `!role 123456789012345678 987654321098765432`
async function execute(message, args) {
  if (args.length < 2) {
    return message.reply(
      `Usage: \`${config.prefix}role <user> <role(s)>\` - e.g. \`${config.prefix}role @Sam Member\``
    );
  }

  const userArg = args.shift();
  const member = await resolveMember(message, userArg);

  if (!member) {
    return message.reply(
      "I couldn't find that user. Mention them or use their user ID."
    );
  }

  const roleArgs = args;
  const resolvedRoles = [];
  const notFound = [];

  for (const roleArg of roleArgs) {
    const role = resolveRole(message.guild, roleArg);

    if (role) {
      resolvedRoles.push(role);
    } else {
      notFound.push(roleArg);
    }
  }

  if (resolvedRoles.length === 0) {
    return message.reply(
      `I couldn't find any of those roles: ${roleArgs.join(", ")}`
    );
  }

  const botMember = await message.guild.members.fetchMe();
  const botHighest = botMember.roles.highest.position;

  const unassignable = [];
  const assignable = [];

  for (const role of resolvedRoles) {
    if (
      role.id === message.guild.id ||
      role.managed ||
      role.position >= botHighest
    ) {
      unassignable.push(role);
    } else {
      assignable.push(role);
    }
  }

  if (assignable.length === 0) {
    return message.reply(
      "I can't assign any of those roles - they're either @everyone, managed by an integration, or above my highest role."
    );
  }

  try {
    await member.roles.add(
      assignable,
      `!role used by ${message.author.tag}`
    );
  } catch (error) {
    console.error("Failed to add roles:", error);
    return message.reply("Something went wrong while adding those roles.");
  }

  const lines = [
    `Gave ${member} the role${assignable.length > 1 ? "s" : ""}: ${assignable
      .map(role => role.toString())
      .join(", ")}.`
  ];

  if (unassignable.length > 0) {
    lines.push(
      `Skipped (can't assign): ${unassignable
        .map(role => role.name)
        .join(", ")}.`
    );
  }

  if (notFound.length > 0) {
    lines.push(`Not found: ${notFound.join(", ")}.`);
  }

  await message.reply(lines.join("\n"));
}

module.exports = {
  execute
};