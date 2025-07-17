const si = require('systeminformation');

const COMMAND_NAME = 'serverinfo';
const PERMISSION_NAME = 'admin.serverinfo';
const PLUGIN_OWNER_ID = 'plugin:serverinfo-command';

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    let parts = [];
    if (d > 0) parts.push(`${d}д`);
    if (h > 0) parts.push(`${h}ч`);
    if (m > 0) parts.push(`${m}м`);
    if (s > 0 || parts.length === 0) parts.push(`${s}с`);

    return parts.join(' ');
}

async function onLoad(bot, options) {
    const log = bot.sendLog;
    const Command = bot.api.Command;
    const settings = options.settings;

    class ServerInfoCommand extends Command {
        constructor() {
            super({
                name: COMMAND_NAME,
                description: 'Показывает информацию о сервере, где запущен бот.',
                aliases: ['серверинфо'],
                permissions: PERMISSION_NAME,
                owner: PLUGIN_OWNER_ID,
                cooldown: 30,
                allowedChatTypes: ['clan', 'private', 'chat']
            });
        }

        async handler(bot, typeChat, user) {
            try {
                const [cpuData, memData, loadData] = await Promise.all([
                    si.cpu(),
                    si.mem(),
                    si.currentLoad()
                ]);

                const cpuModel = cpuData.brand;
                const cpuCores = cpuData.physicalCores;
                const cpuThreads = cpuData.cores;
                const cpuLoad = loadData.currentLoad.toFixed(1);

                const totalMem = (memData.total / (1024 * 1024)).toFixed(0);
                const usedMem = (memData.active / (1024 * 1024)).toFixed(0);

                const uptime = formatUptime(process.uptime());

                for (const line of settings.messageLines) {
                    const formattedLine = line
                        .replace(/{cpuModel}/g, cpuModel)
                        .replace(/{cpuCores}/g, cpuCores)
                        .replace(/{cpuThreads}/g, cpuThreads)
                        .replace(/{cpuLoad}/g, cpuLoad)
                        .replace(/{usedMem}/g, usedMem)
                        .replace(/{totalMem}/g, totalMem)
                        .replace(/{uptime}/g, uptime);

                    bot.api.sendMessage(typeChat, formattedLine, user.username);
                }

            } catch (error) {
                log(`[${PLUGIN_OWNER_ID}] Ошибка при получении информации о сервере: ${error.message}`);
                bot.api.sendMessage(typeChat, 'Не удалось получить информацию о сервере.', user.username);
            }
        }
    }

    try {
        await bot.api.registerPermissions([{
            name: PERMISSION_NAME,
            description: 'Доступ к команде serverinfo',
            owner: PLUGIN_OWNER_ID
        }]);

        await bot.api.addPermissionsToGroup('Admin', [PERMISSION_NAME]);

        await bot.api.registerCommand(new ServerInfoCommand());
        log(`[${PLUGIN_OWNER_ID}] Команда '${COMMAND_NAME}' успешно зарегистрирована.`);

    } catch (error) {
        log(`[${PLUGIN_OWNER_ID}] Ошибка при загрузке: ${error.message}`);
    }
}

async function onUnload({
    botId,
    prisma
}) {
    console.log(`[${PLUGIN_OWNER_ID}] Удаление ресурсов для бота ID: ${botId}`);
    try {
        await prisma.command.deleteMany({
            where: {
                botId,
                owner: PLUGIN_OWNER_ID
            }
        });
        await prisma.permission.deleteMany({
            where: {
                botId,
                owner: PLUGIN_OWNER_ID
            }
        });
        console.log(`[${PLUGIN_OWNER_ID}] Команды и права плагина удалены.`);
    } catch (error) {
        console.error(`[${PLUGIN_OWNER_ID}] Ошибка при очистке ресурсов:`, error);
    }
}

module.exports = {
    onLoad,
    onUnload,
};
