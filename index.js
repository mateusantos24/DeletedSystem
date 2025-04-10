/* Desenvolvido por Rei Ayanami
Script para monitoramento e gerenciamento de mensagens deletadas/editadas no WhatsApp usando o Baileys.
Integração com o Bot Hanako-Kun na versão da Iris - https://github.com/KillovSky/iris (suporta este arquivo executado.)
© 2024 Rei Ayanami. Todos os direitos reservados.
Agradecimentos ao KillovSky pela base de código e tutoriais.

# AVISO
PAGINA (1)
Imagem tutorial: https://i.ibb.co/cc46vd9/Captura-de-tela-2024-11-20-015953.png
Vá até o arquivo "Bot/lib/Commands/Main/Construct/index.js"
Na linha 934, cole o seguinte código: await Indexer('deleted').execute(kill, messageData);

PAGINA (2)
imagem tutorial https://i.ibb.co/jrthttS/Captura-de-tela-2024-11-20-020427.png
Vá até o arquivo "Bot/lib/Databases/Configurations/symlinks.json"
Cole o seguinte código:
"Deleted": {
    "place": "./Commands/Main/Deleted",
    "alias": [
        "deleted",
        "antidelete",
        "deletado"
    ]
}
*/

const fs = require('fs');
const { downloadMediaMessage, downloadContentFromMessage } = require('baileys');

const Indexer = require('../../../index');

let envInfo = JSON.parse(fs.readFileSync(`${__dirname}/utils.json`));

function postResults(response) {
    if (envInfo.settings.finish.value === true || (envInfo.settings.ender.value === true && envInfo.results.success === false)) {
        setTimeout(() => {
            envInfo.functions.revert.value();
        }, envInfo.settings.wait.value);
    }
    return response;
}

function ambientDetails() {
    return envInfo;
}

// Função do SQLITE3
const {
    addMessage,
    checkDeletedMessage,
    addImage,
    addVideo,
    addSticker,
    addVisualizacao,
    addAudio,
    addDocument,
    addVCard,
} = require('./Cache/delete');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
    return `${value} ${sizes[i]}`;
}

async function deleteRun(kill = envInfo.functions.exec.arguments.kill.value, data = envInfo.functions.exec.arguments.data.value) {
    envInfo.results.value = false;
    envInfo.results.success = false;
    const monitorID = envInfo.parameters.monitorID.value;
    // const memoryVideo = Number(envInfo.parameters.memoryVideo.value); // Limite de vídeo 16MB, valor pode ser editado
    const messageText = Number(envInfo.parameters.messageText.value); // Limite máximo de caracteres em mensagens de texto

    if (!monitorID || monitorID.length === 0) return console.warn('[ANTI-DELETED AVISO]: O valor de "monitorID" está vazio. Certifique-se de definir um valor antes de continuar.');

    try {
        /* Se recebeu tudo corretamente, se der ruim, não fará nada */
        if (typeof kill === 'object' && typeof data === 'object') {
            const {
                id,
                user,
                chatId,
                pushname,
                name,
                time,
                quoteThis,
                mimetype,
                message,
                quotedMsg,
                recMessage,
                type,
                quotedMsgObj,
            } = data;
            if (/^(status@broadcast|.*@(lid|bot))$/.test(user)) return;
            const isMediaMessage = quoteThis?.message?.stickerMessage || quoteThis?.message?.imageMessage || quoteThis?.message?.videoMessage || quoteThis?.message?.audioMessage || quoteThis?.message?.documentWithCaptionMessage?.message?.documentMessage || quoteThis?.message?.documentMessage;
            const isVisu = quoteThis.message?.viewOnceMessageV2?.message?.videoMessage || quoteThis.message?.viewOnceMessage?.message?.videoMessage || quoteThis?.message?.viewOnceMessageV2?.message?.imageMessage || quoteThis.message?.viewOnceMessage?.message?.imageMessage || false;
            if (isVisu) {
                isVisu.viewOnce = false;
            }
            const quotedMsgBuffer = quoteThis?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const imageMessage = quotedMsgBuffer?.imageMessage || quotedMsgBuffer?.viewOnceMessageV2?.message?.imageMessage;
            let decryptedMediaView = '';
            if (imageMessage) {
                try {
                    const stream = await downloadContentFromMessage(imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    decryptedMediaView = buffer;
                } catch (error) {
                    console.log('Error downloading quoted image:', error);
                    decryptedMediaView = '';
                }
            }

            const decryptedMediaDelete = (isMediaMessage || isVisu) ? await downloadMediaMessage(quoteThis, 'buffer') : '';
            const mentionUser = recMessage?.key?.participant ? recMessage?.key?.participant : user;
            const userNames = Indexer('sql').get('personal', mentionUser, chatId).value;
            const checkName = userNames === 'default' || !userNames.name.text.trim() ? pushname : userNames.name.text.trim();
            const editarID = recMessage?.key?.id || '';
            const mentionID = quotedMsg?.stanzaId || '';
            const contactCard = recMessage?.vcard;

            const wasDeletedByAdmin = user && user !== mentionUser;
            const deletedBy = wasDeletedByAdmin ? user : mentionUser;
            const deletedByName = Indexer('sql').get('personal', user, chatId).value;
            const deletedByDisplayName = !deletedByName || deletedByName === 'default' || !deletedByName.name.text.trim() ? (pushname || 'Desconhecido') : deletedByName.name.text.trim();

            const deletedInfo = wasDeletedByAdmin ? `*⭐ APAGADO POR UM ADMIN:* (${deletedByDisplayName}) [${deletedBy.replace('@s.whatsapp.net', '')}]\n\n` : '';

            var baileysMessage = {};
            let alertaLog = false;
            let DeleteMessage;
            if (quotedMsgObj?.viewOnce) {
                addVisualizacao(mentionID, decryptedMediaView, false);
                addMessage(user, mentionID, quotedMsgObj?.caption, quotedMsgObj?.mimetype, 5);
            }
            switch (type) {
            // Anti Deletado
            case 'protocolMessage': {
                DeleteMessage = await checkDeletedMessage(mentionUser, editarID);
                // console.log(DeleteMessage); // Debug 
                const cmdColor = config.colorSet.value[2]; // red 2
                if (!DeleteMessage) return console.log(Indexer('color').echo('[ANTI-DELETED] ' + checkName + ' (' + mentionUser.replace('@s.whatsapp.net', '') + ') A mensagem deletada não foi encontrada e será ignorada...', cmdColor).value);
                const UserDelete = DeleteMessage?.user;
                const TextDelete = DeleteMessage?.message;
                const mediaDataDelete = DeleteMessage?.mediaData;
                console.log(Indexer('color').echo('╔═══════════════ ANTI-DELETE LOG ═══════════════╗\n'
                    + '║ User: ' + `${checkName} (${UserDelete.replace('@s.whatsapp.net', '')})` + '\n'
                    + '║ Text: ' + (TextDelete?.length > 20 ? TextDelete.substring(0, 20) + '...' : TextDelete) + '\n'
                    + '║ Status: ' + (DeleteMessage?.status || '0') + '\n'
                    + '║ Media: ' + (mediaDataDelete ? 'YES' : 'NO') + '\n'
                    + '╚═══════════════════════════════════════════════╝', cmdColor).value);
                switch (DeleteMessage?.status) {
                case 0: { // Mensagens de texto
                    baileysMessage.text = '🚨 *EITA, MENSAGEM DELETADA!* 🚨\n\n'
                    + '👀 Achou que dava pra apagar na miúda, né? Pegamos no pulo!\n\n'
                    + '🙋‍♂️ *Autor:* ' + checkName + ' (' + mentionUser.replace('@s.whatsapp.net', '') + ')\n'
                    + '👥 *Grupo:* ' + name + '\n'
                    + '📅 *Quando mandou:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '🕵️ *Detectado agora:* ' + time + '\n\n'
                    + deletedInfo
                    + '💬 *Mensagem recuperada:*\n'
                    + '> ' + TextDelete + '\n\n'
                    + '😎 Tenta apagar de novo, vai... Já foi tarde!';
                    break;
                }
                case 1: { // Mensagens de imagem
                    baileysMessage.image = mediaDataDelete?.uploaded;
                    baileysMessage.caption = '🖼️ *ALERTA DE IMAGEM DELETADA* 🖼️\n\n'
                    + '😏 Acha que ia passar batido?\n'
                    + '📸 *Imagem apagada com sucesso (mas não pra gente)!*\n\n'
                    + '👤 *Autor:* ' + checkName + ' (' + UserDelete.replace('@s.whatsapp.net', '') + ')\n'
                    + '👥 *Grupo:* ' + name + '\n'
                    + '🕒 *Enviada em:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '🧠 *Detectamos em:* ' + time + '\n\n'
                    + '📁 *Tamanho:* ' + formatBytes(mediaDataDelete.uploaded.length) + '\n'
                    + '📐 *Resolução:* ' + mediaDataDelete.width + 'x' + mediaDataDelete.height + '\n'
                    + '📦 *Tipo:* ' + mediaDataDelete.mimetype + '\n\n'
                    + deletedInfo
                    + '🫢 *Não adianta apagar... o bot viu tudo!*\n'
                    + '> ' + TextDelete;
                    baileysMessage.mimetype = mediaDataDelete.mimetype;
                    break;
                }
                case 2: { // Mensagens de texto Editado
                    // Em breve....
                    break;
                }
                case 3: { // Mensagens de Stickers
                    await kill.sendMessage(chatId, { sticker: mediaDataDelete?.uploaded, mimetype: mediaDataDelete.mimetype });
                    await Indexer('others').sleep(1000);
                    baileysMessage.text = '🚨 *ALERTA DE STICKER DELETADO* 🚨\n\n'
                    + '👀 Pegamos no flagra!\n'
                    + `🔹 *Grupo:* ${name}\n`
                    + `🔹 *Membro:* ${checkName} (${UserDelete.replace('@s.whatsapp.net', '')})\n`
                    + `📅 *Enviado em:* ${new Date(DeleteMessage.time).toLocaleString()}\n`
                    + `🕵️‍♂️ *Detectado:* ${time}\n\n`
                    + `📁 Tamanho: ${formatBytes(mediaDataDelete.uploaded.length)}\n`
                    + `📦 Mimetype: ${mediaDataDelete.mimetype}\n\n`
                    + deletedInfo
                    + 'Não adianta apagar... já vimos! 😜\n'
                    + `> ${TextDelete}`;
                    break;
                }
                case 4: { // Mensagens de vídeo
                    baileysMessage.video = mediaDataDelete?.uploaded;
                    baileysMessage.caption = '🎥 *VÍDEO DELETADO DETECTADO!* 🎥\n\n'
                    + '🎭 Tentou sumir com o vídeo? O FBI do Zap já viu tudo!\n\n'
                    + '🙋‍♂️ *Autor:* ' + checkName + ' (' + UserDelete.replace('@s.whatsapp.net', '') + ')\n'
                    + '👥 *Grupo:* ' + name + '\n'
                    + '📅 *Enviado em:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '🕵️ *Detectado agora:* ' + time + '\n\n'
                    + '📁 Tamanho: ' + formatBytes(mediaDataDelete.uploaded.length) + '\n'
                    + '📦 Mimetype: ' + mediaDataDelete.mimetype + '\n'
                    + '⏱ Duração: ' + mediaDataDelete.seconds + ' segundos\n\n'
                    + '💬 *Mensagem que acompanhava:*\n'
                    + '> ' + TextDelete + '\n\n'
                    + deletedInfo
                    + '😎 Apagar não apaga o passado... Já tá tudo salvo no HD da zoeira!';
                    baileysMessage.mimetype = mediaDataDelete.mimetype;
                    break;
                }
                case 5: { // Mensagens de visualização
                    if (!DeleteMessage?.status) return 1;
                    baileysMessage.viewOnce = false;
                    if (DeleteMessage.type.startsWith('video')) {
                        baileysMessage.video = mediaDataDelete?.data;
                    } else if (DeleteMessage.type.startsWith('image')) {
                        baileysMessage.image = mediaDataDelete?.data;
                    }
                    baileysMessage.caption = '👀 *VISUALIZAÇÃO ÚNICA DETECTADA & DELETADA!* 👀\n\n'
                    + '🎬 *Operação Olho Vivo Ativada!*\n'
                    + '💣 Tentou mandar e apagar como se ninguém visse? Tarde demais, agente secreto!\n\n'
                    + '🙋‍♂️ *Autor:* ' + checkName + ' (' + UserDelete.replace('@s.whatsapp.net', '') + ')\n'
                    + '👥 *Grupo:* ' + name + '\n'
                    + '📅 *Enviado em:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '🕵️ *Detectado no exato momento:* ' + time + '\n\n'
                    + '📁 *Tamanho:* ' + formatBytes(mediaDataDelete?.data?.length) + '\n'
                    + '📦 *Tipo:* ' + DeleteMessage.type + '\n\n'
                    + '💬 *Mensagem secreta que veio junto:*\n'
                    + '> ' + TextDelete + '\n\n'
                    + '🎥 E a câmera do bot? Sempre ligada. Cê vacilou... nós printamos!';
                    baileysMessage.mimetype = DeleteMessage?.type;
                    addVisualizacao(DeleteMessage.id, decryptedMediaView, true);
                    break;
                }
                case 6: { // Mensagens de áudio
                    await kill.sendMessage(chatId, { audio: mediaDataDelete?.uploaded, mimetype: mediaDataDelete.mimetype });
                    await Indexer('others').sleep(1000);
                    baileysMessage.caption = '🎵 *ÁUDIO DELETADO DETECTADO!* 🎵\n\n'
                    + '🎙️ Tentou mandar aquele áudio e apagar rapidinho? HA! Pegamos! 😂\n\n'
                    + '🙋‍♂️ *Autor:* ' + checkName + ' (' + UserDelete.replace('@s.whatsapp.net', '') + ')\n'
                    + '👥 *Grupo:* ' + name + '\n'
                    + '📅 *Enviado em:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '🕵️ *Detectado agora:* ' + time + '\n\n'
                    + '📁 Tamanho: ' + formatBytes(mediaDataDelete.uploaded.length) + '\n'
                    + '📦 Mimetype: ' + mediaDataDelete.mimetype + '\n'
                    + '⏱ Duração: ' + mediaDataDelete.seconds + ' segundos\n\n'
                    + deletedInfo
                    + '🔊 Já escutamos tudinho… Nada escapa do bot! 😎';
                    break;
                }
                case 7: { // Mensagens de documentos
                    baileysMessage.document = mediaDataDelete?.data;
                    baileysMessage.mimetype = `application/${DeleteMessage.type}`;
                    baileysMessage.fileName = mediaDataDelete?.title;
                    baileysMessage.caption = '🎙 *ATENÇÃO, BRASIL!* 📢\n\n'
                    + 'Hoje no *Arquivo Confidencial do Zap*... alguém tentou apagar um documento, MAS O BOT VIU TUDO!\n\n'
                    + '👤 *Nome:* ' + checkName + '\n'
                    + '📞 *Número:* ' + UserDelete.replace('@s.whatsapp.net', '') + '\n'
                    + '📌 *Grupo:* ' + name + '\n\n'
                    + '📎 *Documento:* ' + (mediaDataDelete?.title || 'Sem título') + '\n'
                    + '📦 *Formato:* ' + DeleteMessage.type + '\n'
                    + '📁 *Tamanho:* ' + formatBytes(mediaDataDelete.data.length) + '\n\n'
                    + '📅 *Original:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '⏱ *Detectado:* ' + time + '\n\n'
                    + deletedInfo
                    + '📼 E assim a verdade foi revelada. Fica ligado, porque aqui nada passa batido! 🤓';
                    break;
                }
                case 8: { // Mensagens de vCard
                    await kill.sendMessage(chatId, { contacts: { contacts: [{ vcard: mediaDataDelete?.data }] } });
                    await Indexer('others').sleep(1000);
                    baileysMessage.text = '👤 *EITA! TENTOU APAGAR UM CONTATO?* 😜\n\n'
                    + '💥 Mal sabia que o *Zap Detetive* estava de olho!\n\n'
                    + '📌 *Grupo:* ' + name + '\n'
                    + '🧍‍♂️ *Apagador:* ' + checkName + ' (' + UserDelete.replace('@s.whatsapp.net', '') + ')\n'
                    + '📅 *Mandou:* ' + new Date(DeleteMessage.time).toLocaleString() + '\n'
                    + '⏱ *Apagou às:* ' + time + '\n\n'
                    + deletedInfo
                    + '📇 *Contato recuperado! Não adianta apagar!* 🚨';
                    break;
                }
                case 9: { // Mensagens de localização
                    // Em breve....
                    break;
                }
                }
                alertaLog = true;
                break;
            }

            // Sistema de eventos automáticos atualizado
            case 'LiveLocationMessage': {
                // Em breve....
                break;
            }
            case 'contactMessage': {
                addVCard(id, contactCard);
                addMessage(user, id, message, 'vCard', 8);
                break;
            }
            case 'documentWithCaptionMessage':
            case 'documentMessage': {
                addDocument(id, recMessage?.fileName, decryptedMediaDelete);
                addMessage(user, id, message, mimetype, 7);
                break;
            }
            case 'audioMessage': {
                addAudio(id, decryptedMediaDelete, recMessage);
                addMessage(user, id, message, mimetype, 6);
                break;
            }
            case 'videoMessage': {
                addVideo(id, decryptedMediaDelete, recMessage);
                addMessage(user, id, message, mimetype, 4);
                break;
            }
            case 'stickerMessage': {
                addSticker(id, decryptedMediaDelete, recMessage);
                addMessage(user, id, message, mimetype, 3);
                break;
            }
            case 'imageMessage': {
                addImage(id, decryptedMediaDelete, recMessage);
                addMessage(user, id, message, mimetype, 1);
                break;
            }
            case 'conversation':
            case 'extendedTextMessage': {
                if (message.length <= messageText) {
                    addMessage(user, id, message, 'text/plain', 0);
                }
                break;
            }
            }

            // Avisa que uma mensagem foi deletada Notificar alerta
            if (alertaLog) {
                await kill.sendMessage(chatId, baileysMessage, { quoted: quoteThis });
                alertaLog = false;
            }
        }
        envInfo.results.success = true;
    } catch (error) {
        console.log(error);
    }
    return postResults(envInfo.results);
}

function resetAmbient(changeKey = {}) {
    envInfo.results.success = false;
    let exporting = {
        reset: resetAmbient,
    };

    try {
        envInfo = JSON.parse(fs.readFileSync(`${__dirname}/utils.json`));
        if (Object.keys(changeKey).length !== 0) {
            Object.keys(changeKey).forEach((key) => {
                if (Object.keys(envInfo).includes(key) && key !== 'developer') {
                    envInfo[key] = changeKey[key];
                }
            });
        }

        envInfo.functions.poswork.value = postResults;
        envInfo.functions.ambient.value = ambientDetails;
        envInfo.functions.revert.value = resetAmbient;
        envInfo.functions.exec.value = deleteRun;
        envInfo.parameters.location.value = __filename;
        module.exports = {
            [envInfo.name]: {
                [envInfo.exports.env]: envInfo.functions.ambient.value,
                [envInfo.exports.messedup]: envInfo.functions.messedup.value,
                [envInfo.exports.poswork]: envInfo.functions.poswork.value,
                [envInfo.exports.reset]: envInfo.functions.revert.value,
                [envInfo.exports.exec]: envInfo.functions.exec.value,
            },
            Developer: 'Rei Ayanami',
            Projects: 'https://github.com/maradona4',
        };

        envInfo.results.success = true;
        exporting = module.exports;
    } catch (error) {
        console.log(error);
    }
    return exporting;
}

resetAmbient();
