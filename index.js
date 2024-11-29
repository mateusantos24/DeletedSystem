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
const axios = require('axios');

const { downloadMediaMessage } = require('baileys');

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
const { addMessage, checkDeletedMessage } = require('./Cache/delete');

let lastCheckedVersion = null;

async function deleteRun(kill = envInfo.functions.exec.arguments.kill.value, data = envInfo.functions.exec.arguments.data.value) {
    envInfo.results.value = false;
    envInfo.results.success = false;
    const monitorID = envInfo.parameters.monitorID.value;
    const outUpdate = envInfo.updated;

    // URL do arquivo utils.json no GitHub
    const remoteUtilsURL = 'https://raw.githubusercontent.com/maradona4/DeletedSystem/main/utils.json';
    async function checkForUpdates() {
        try {
            const response = await axios.get(remoteUtilsURL, { timeout: 1000 });
            const remoteUtils = response.data;

            if (outUpdate !== remoteUtils.updated && lastCheckedVersion !== remoteUtils.updated) {
                console.log('\x1b[91m%s\x1b[0m', `[DELETE SYSTEM] \x1b[33mNOVA VERSÃO FOI LANÇADA!\x1b[0m \x1b[36m(Local: ${outUpdate}) (Novas: ${remoteUtils.updated})\x1b[0m`);
                console.log('\x1b[91m%s\x1b[0m', '[DELETE SYSTEM] \x1b[36mAcesse a nova versão no GitHub: \x1b[33mhttps://github.com/maradona4/DeletedSystem');
                console.log('\x1b[91m%s\x1b[0m', '[DELETE SYSTEM] Atualize seu sistema para a versão mais recente para evitar problemas.');
                lastCheckedVersion = remoteUtils.updated;
            } else if (outUpdate === remoteUtils.updated && lastCheckedVersion !== remoteUtils.updated) {
                console.log('\x1b[92m%s\x1b[0m', '[DELETE SYSTEM] Parabéns, sua versão está atualizada!');
                lastCheckedVersion = remoteUtils.updated;
            }
        } catch (error) {
            if (error.code === 'ETIMEDOUT') {
                console.error('\x1b[91m%s\x1b[0m', '[DELETE SYSTEM] Verifique sua conexão com a internet e tente novamente.');
            } else if (error.code === 'ENOTFOUND') {
                console.error('\x1b[91m%s\x1b[0m', '[DELETE SYSTEM] URL não encontrada. Verifique se o link está correto.');
            } else {
                console.error('\x1b[91m%s\x1b[0m', '[DELETE SYSTEM] Um erro inesperado ocorreu ao verificar atualizações:', error.message);
            }
        }
    }
    if (!monitorID || monitorID.length === 0) return console.warn('[ANTI-DELETED AVISO]: O valor de "monitorID" está vazio. Certifique-se de definir um valor antes de continuar.');

    try {
        /* Se recebeu tudo corretamente, se der ruim, não fará nada */
        if (typeof kill === 'object' && typeof data === 'object') {
            const {
                id,
                user,
                quoteThis,
                type,
                pushname,
                chatId,
                body,
                name,
                time,
                mimetype,
            } = data;
            const isMediaMessage = quoteThis?.message?.stickerMessage || quoteThis?.message?.imageMessage || quoteThis?.message?.videoMessage || quoteThis?.message?.audioMessage || quoteThis?.message?.documentWithCaptionMessage?.message?.documentMessage || quoteThis?.message?.documentMessage;
            const isVisu = quoteThis.message?.viewOnceMessageV2?.message?.videoMessage || quoteThis.message?.viewOnceMessage?.message?.videoMessage || quoteThis?.message?.viewOnceMessageV2?.message?.imageMessage || quoteThis.message?.viewOnceMessage?.message?.imageMessage || false;
            if (isVisu) {
                isVisu.viewOnce = false;
            }
            const decryptedMedia = (isMediaMessage || isVisu) ? await downloadMediaMessage(quoteThis, 'buffer') : '';

            const mentionUser = quoteThis?.message?.protocolMessage?.key?.participant ? quoteThis?.message?.protocolMessage?.key?.participant : user;
            const userNames = Indexer('sql').get('personal', mentionUser, chatId).value;
            const checkName = userNames === 'default' || !userNames.name.text.trim() ? pushname : userNames.name.text.trim();
            const Msg = quoteThis?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption || quoteThis?.message?.documentMessage?.caption || quoteThis?.message?.videoMessage?.caption || quoteThis?.message?.imageMessage?.caption || quoteThis?.message?.extendedTextMessage?.text || quoteThis.message?.conversation || '';
            const tipos = quoteThis?.message?.protocolMessage ? 'protocolMessage' : quoteThis?.message?.extendedTextMessage ? 'extendedTextMessage' : quoteThis?.message?.conversation ? 'conversation' : quoteThis?.message?.viewOnceMessageV2 ? 'viewOnceMessageV2' : quoteThis?.message?.viewOnceMessage ? 'viewOnceMessage' : quoteThis?.message?.stickerMessage ? 'stickerMessage' : quoteThis?.message?.imageMessage ? 'imageMessage' : quoteThis?.message?.videoMessage ? 'videoMessage' : quoteThis?.message?.audioMessage ? 'audioMessage' : quoteThis?.message?.documentMessage ? 'documentMessage' : quoteThis?.message?.editedMessage ? 'editedMessage' : quoteThis?.editedMessage ? 'editedMessage' : type;
            const editarID = quoteThis?.message?.editedMessage?.message?.protocolMessage?.key?.id || quoteThis?.message?.protocolMessage?.key?.id || '';
            const FileNameDoc = quoteThis?.message?.documentWithCaptionMessage?.message?.documentMessage?.fileName || quoteThis?.message?.documentMessage?.fileName || false;
            const contactCard = quoteThis.message?.contactMessage?.vcard ? quoteThis.message.contactMessage.vcard : false;

            var baileysMessage = {};
            let alertaLog = false;

            // Declara fora do switch (result)
            let result;
            let tiposValidosRegExp = /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|zip|x-rar-compressed|x-7z-compressed|x-tar|gzip|vnd\.oasis\.opendocument\.(text|spreadsheet|presentation)|epub\+zip|json|rtf|octet-stream)|text\/(plain|csv|markdown|html)|application\/javascript)$/;

            switch (tipos) {
            // Anti editado
            case 'editedMessage': {
                const editedMessageObj = quoteThis?.editedMessage?.message?.protocolMessage?.editedMessage || quoteThis?.message?.editedMessage?.message?.protocolMessage?.editedMessage || quoteThis?.editedMessage?.message?.editedMessage;
                const editedMessage = editedMessageObj?.videoMessage?.caption
                  || editedMessageObj?.imageMessage?.caption
                  || editedMessageObj?.extendedTextMessage?.text
                  || editedMessageObj?.conversation
                  || editedMessageObj?.documentMessage?.title
                  || editedMessageObj?.stickerMessage?.emoji
                  || 'Mensagem editada não disponível';
                addMessage(user, editarID, body, editedMessage, 2, true, mimetype, false, false);
                await Indexer('others').sleep(2000); // Intervalo de 2 segundos carregar o Banco de dados
                let LastUpdateNow = await checkDeletedMessage(user, editarID);
                const { message, tipos, upload, oldBody } = LastUpdateNow;
                if (tipos === 'video/mp4') {
                    baileysMessage.video = upload;
                    baileysMessage.caption = `*⚠️ ALERTA MENSAGEM EDITADA 📝*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ MENSAGEM EDITADA:*\n\n> ANTIGA: ${oldBody}\n#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-\n> NOVA: ${message}`;
                    baileysMessage.mimetype = mimetype;
                } else if (tipos === 'image/jpeg') {
                    baileysMessage.image = upload;
                    baileysMessage.caption = `*⚠️ ALERTA MENSAGEM EDITADA 📝*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ MENSAGEM EDITADA:*\n\n> ANTIGA: ${oldBody}\n#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-\n> NOVA: ${message}`;
                    baileysMessage.mimetype = mimetype;
                } else {
                    baileysMessage.text = `*⚠️ ALERTA MENSAGEM EDITADA 📝*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ MENSAGEM EDITADA:*\n\n> ANTIGA: ${oldBody}\n#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-\n> NOVA: ${message}`;
                }
                alertaLog = true;
                break;
            }

            // Anti Deletado
            case 'protocolMessage': {

                result = await checkDeletedMessage(mentionUser, editarID);
                if (result) {
                    // eslint-disable-next-line no-unused-vars
                    const { message, captionMessage, oldBody, tipos, upload, status, doctitle } = result;
                    if (tipos === 'video/mp4' || tipos === 'video/webm' || tipos === 'video/ogg' || tipos === 'video/3gpp' || tipos === 'video/avi' || tipos === 'video/mkv' || tipos === 'video/flv' || tipos === 'video/quicktime') {
                        baileysMessage.viewOnce = false;
                        baileysMessage.video = upload;
                        baileysMessage.caption = `*⚠️ ALERTA DO VÍDEO 🎬*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ VÍDEO FOI APAGADO E DETECTADO*\n> ${message || captionMessage || ''}`;
                        baileysMessage.mimetype = tipos;
                    } else if (tipos === 'image/jpeg' || tipos === 'image/png' || tipos === 'image/gif') {
                        baileysMessage.viewOnce = false;
                        baileysMessage.image = upload;
                        baileysMessage.caption = `*⚠️ ALERTA DA IMAGEM 🖼*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ IMAGEM FOI APAGADA E DETECTADA*\n> ${message || captionMessage || ''}`;
                        baileysMessage.mimetype = tipos;
                    } else if (tipos === 'image/webp') {
                        await kill.sendMessage(monitorID, { sticker: upload });
                        await Indexer('others').sleep(1000); // Intervalo de 1 segundo entre stickers, risco de banimento por duplicação no WhatsAp
                        baileysMessage.text = `*⚠️ ALERTA DAS FIGURINHAS 👾*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ FOI APAGADA E DETECTADA*\n> ${message || captionMessage || ''}`;
                    } else if (tipos === 'audio/mp4' || tipos === 'audio/mpeg' || tipos === 'audio/ogg; codecs=opus' || tipos === 'audio/wav' || tipos === 'audio/flac' || tipos === 'audio/webm') {
                        await kill.sendMessage(monitorID, { audio: upload, mimetype: tipos, ptt: false });
                        await Indexer('others').sleep(1000); // Intervalo de 1 segundo entre audio, risco de banimento por duplicação no WhatsAp
                        baileysMessage.text = `*⚠️ ALERTA DO ÁUDIO 🔊*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ ÁUDIO FOI APAGADO E DETECTADO*\n> ${message || captionMessage || ''}`;
                    } else if (tipos === 'vCard') {
                    // Extração do nome a partir da vCard
                        const displayNameMatch = upload.match(/FN:(.*)/); // RegEx para capturar o valor após 'FN:'
                        const displayName = displayNameMatch ? displayNameMatch[1].trim() : 'Desconhecido';

                        // Extração do número de telefone da vCard
                        const phoneMatch = upload.match(/TEL;waid=(\d+):(\+?\d+)/); // RegEx para capturar o número de telefone com WhatsApp
                        const phoneNumber = phoneMatch ? `${phoneMatch[1]}:${phoneMatch[2]}` : 'Número não encontrado';
                        const vcard = 'BEGIN:VCARD\n'
                        + 'VERSION:3.0\n'
                        + `FN:${displayName}\n`
                        + `ORG:${displayName};\n`
                        + `TEL;type=CELL;type=VOICE;waid=${phoneNumber}\n`
                        + 'END:VCARD';
                        await kill.sendMessage(monitorID, { contacts: { displayName: displayName, contacts: [{ vcard }] } });
                        await Indexer('others').sleep(1000); // Intervalo de 1 segundo entre audio, risco de banimento por duplicação no WhatsAp
                        baileysMessage.text = `*⚠️ ALERTA DO CONTATO 🔊*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ CONTATO FOI APAGADO E DETECTADO*\n> ${message || captionMessage || ''}`;
                    } else if (tiposValidosRegExp.test(tipos)) {
                        baileysMessage.document = upload;
                        baileysMessage.mimetype = tipos;
                        baileysMessage.fileName = doctitle;
                        baileysMessage.caption = `*⚠️ ALERTA DO DOCUMENTOS 📚*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ DOCUMENTOS FORAM APAGADOS E DETECTADOS*\n> ${message || captionMessage || ''}`;
                    } else {
                        baileysMessage.text = `*⚠️ ALERTA DAS MENSAGENS 📝*\n*✪ PL:* ${checkName}\n*✪ GP:* ${name}\n*✪ DDD:* ${user.replace('@s.whatsapp.net', '')}\n*✪ TEMPO:* ${time}\n*✪ MENSAGENS FORAM APAGADAS E DETECTADAS*\n> ${message || captionMessage || ''}`;
                    }
                    alertaLog = true;
                }
                break;
            }

            // Sistema de eventos automáticos atualizado
            case 'contactMessage': {
                addMessage(user, id, body, Msg, 8, false, 'vCard', contactCard, false);
                break;
            }
            case 'documentWithCaptionMessage':
            case 'documentMessage': {
                addMessage(user, id, '', Msg, 7, false, mimetype, decryptedMedia, FileNameDoc);
                break;
            }
            case 'audioMessage': {
                addMessage(user, id, body, Msg, 6, false, mimetype, decryptedMedia, false);
                break;
            }
            case 'viewOnceMessageV2':
            case 'viewOnceMessage': {
                addMessage(user, id, body, Msg, 5, false, mimetype, decryptedMedia, false);
                break;
            }
            case 'videoMessage': {
                addMessage(user, id, body, Msg, 4, false, mimetype, decryptedMedia, false);
                break;
            }
            case 'stickerMessage': {
                addMessage(user, id, body, Msg, 3, false, mimetype, decryptedMedia, false);
                break;
            }
            case 'imageMessage': {
                addMessage(user, id, body, Msg, 1, false, mimetype, decryptedMedia, false);
                break;
            }
            case 'conversation':
            case 'extendedTextMessage': {
                addMessage(user, id, body, Msg, false, false, false, false, false, false);
                break;
            }
            }

            // Avisa que uma mensagem foi deletada Notificar alerta
            if (alertaLog) {
                await kill.sendMessage(monitorID, baileysMessage, { quoted: quoteThis });
                alertaLog = false;
            }
        }
        envInfo.results.success = true;
    } catch (error) {
        console.log(error);
    }
    checkForUpdates();
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
