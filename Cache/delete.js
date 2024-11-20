// Desenvolvido por Rei Ayanami
// Script para gerenciamento de mensagens e usuários inativos em SQLite com integração para bots de mensagens
// © 2024 Rei Ayanami. Todos os direitos reservados.
// Bot Hanako-Kun na versão da Iris - https://github.com/KillovSky/iris suporta este arquivo executado.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment-timezone');

// Define o caminho do banco de dados
const dbPath = path.resolve(`${__dirname}/antidelete.db`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            user TEXT,
            id TEXT,
            time INTEGER,
            body TEXT,
            caption TEXT,
            old_body TEXT,
            type TEXT,
            edited INTEGER,
            status INTEGER,
            imgvid TEXT,
            doctitle TEXT
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            }
        });
    }
});

// Função para verificar e excluir contas inativas
function deleteInactiveUsersRealTime() {
    const currentTime = Date.now();
    const fiveDaysInMilliseconds = 5 * 24 * 60 * 60 * 1000; // 5 dias em milissegundos

    db.serialize(() => {
        // Seleciona usuários inativos há mais de 5 dias
        db.all('SELECT DISTINCT user, MAX(time) as lastActivity FROM messages GROUP BY user HAVING ? - lastActivity > ?', [currentTime, fiveDaysInMilliseconds], (err, rows) => {
            if (err) {
                console.error('Erro ao buscar usuários inativos:', err.message);
                return;
            }

            if (rows && rows.length > 0) {
                rows.forEach((row) => {
                    const { user } = row;
                    console.log(`Excluindo dados do usuário inativo: ${user}`);
                    db.run('DELETE FROM messages WHERE user = ?', [user], (err) => {
                        if (err) {
                            console.error(`Erro ao excluir dados do usuário ${user}:`, err.message);
                        } else {
                            console.log(`Usuário ${user} excluído com sucesso.`);
                        }
                    });
                });
            }
        });
    });
}

// Função para adicionar ou editar mensagens
function addMessage(user, id, body, caption, status, edited, type, imgvid, doctitle) {
    db.serialize(() => {
        // Verifica se já existe uma mensagem do usuário com o mesmo ID
        db.get('SELECT * FROM messages WHERE user = ? AND id = ?', [user, id], (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }

            if (row) {
                // Atualiza a mensagem existente
                db.run('UPDATE messages SET old_body = ?, body = ?, caption = ?, time = ?, edited = 1, status = ?, doctitle = ? WHERE user = ? AND id = ?', [row.body, body, caption, Date.now(), status, doctitle, user, id], (err) => {
                    if (err) {
                        console.error(err.message);
                    }
                });
            } else {
                // Adiciona uma nova mensagem, limitando a 50 por usuário
                db.get('SELECT COUNT(*) as count FROM messages WHERE user = ?', [user], (err, row) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    if (row.count >= 50) {
                        // Exclui a mensagem mais antiga se houver mais de 50
                        db.run('DELETE FROM messages WHERE rowid IN (SELECT rowid FROM messages WHERE user = ? ORDER BY rowid ASC LIMIT 1)', [user], (err) => {
                            if (err) {
                                console.error('Erro ao excluir mensagem antiga:', err.message);
                            }
                        });
                    }

                    // Insere a nova mensagem
                    db.run('INSERT INTO messages (user, id, time, body, caption, type, imgvid, edited, status, doctitle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [user, id, Date.now(), body, caption, type, imgvid, edited, status, doctitle], (err) => {
                        if (err) {
                            console.error(err.message);
                        } else {
                            // Limpeza de dados de usuários inativos após inserção de mensagem
                            deleteInactiveUsersRealTime();
                        }
                    });
                });
            }
        });
    });
}

// Função para verificar mensagens deletadas
function checkDeletedMessage(user, id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT body, caption, old_body, type, imgvid, edited, status, doctitle FROM messages WHERE user = ? AND id = ?', [user, id], (err, row) => {
            if (err) {
                console.error('Erro ao buscar mensagem:', err.message);
                reject(err);
                return;
            }
            if (row) {
                const { body: message, caption: captionMessage, old_body: oldBody, type: tipos, imgvid: upload, status, doctitle } = row;
                resolve({ message, captionMessage, oldBody, tipos, upload, status, doctitle });
            } else {
                resolve(null);
            }
        });
    });
}

// Função para ocultar URLs
function hideUrls(message) {
    return message.replace(/https?:\/\/[^\s]+/g, 'https://chat.whatsapp.com/*************');
}

// Função para formatar a data para o horário de Brasília
function formatDateToBrasilia(timestamp) {
    return moment(timestamp).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
}

function CheckMessage(user) {
    return new Promise((resolve, reject) => {
        db.all('SELECT body, caption, old_body, time, edited, status FROM messages WHERE user = ?', [user], (err, rows) => {
            if (err) {
                console.error('Erro ao buscar mensagens:', err.message);
                reject(err);
                return;
            }

            const messages = rows.filter(row => row.body && row.body.trim().length > 0).map(row => {
                const formattedTime = formatDateToBrasilia(row.time);
                if (row.status === 1) {
                    return `[${formattedTime}] Imagem: 🖼`;
                } else if (row.status === 3) {
                    return `[${formattedTime}] Stickers: 👾`;
                } else if (row.status === 4) {
                    return `[${formattedTime}] Video: 🎬`;
                } else if (row.status === 5) {
                    return `[${formattedTime}] Visualização: 👁‍🗨`;
                } else if (row.status === 6) {
                    return `[${formattedTime}] Audio: 🔊`;
                } else if (row.status === 7) {
                    return `[${formattedTime}] Documentos: 📚`;
                } else if (row.status === 8) {
                    return `[${formattedTime}] Contato: 📞`;
                } else if (row.edited && row.old_body !== row.body) {
                    return `[${formattedTime}] *[ANTIGA MENSAGEM EDITADA]:* "${row.old_body}"\n[${formattedTime}] *[NOVA MENSAGEM EDITADA]:* "${row.body}"`;
                }
                return `[${formattedTime}] ` + hideUrls(row.body);
            });
            resolve(messages.length > 0 ? messages : []);
        });
    });
}

// Lembre-se do comando '/dellast': ele remove mensagens recentes do histórico. Há um alto risco de banimento, tome cuidado
function getAllMessagesInChat(user, quantidades) {
    return new Promise((resolve, reject) => {
        db.all('SELECT id FROM messages WHERE user = ? ORDER BY time DESC LIMIT ?', [user, quantidades], (err, rows) => {
            if (err) {
                console.error('Erro ao buscar IDs de mensagens:', err.message);
                reject(err);
                return;
            }

            const messageIds = rows.map(row => row.id);
            if (messageIds.length === 0) {
                reject('Nenhuma mensagem encontrada para este usuário.');
                return;
            }
            resolve(messageIds);
        });
    });
}

// #COMANDOS
/* const { getAllMessagesInChat } = require('arquivo'); // Certifique-se de que o caminho do arquivo esteja correto

case 'dellast':
    if (!isGroupMsg) return await kill.sendMessage(chatId, { text: 'Somente grupos podem usar os comandos.', }, { quoted: quoteThis });
    if (!isGroupAdmins) return  await kill.sendMessage(chatId, { text: 'Você não é um administrador desde grupos.', }, { quoted: quoteThis });
    if (!isBotGroupAdmins) return  await kill.sendMessage(chatId, { text: 'O bot precisa de um administrador para ser executado.', }, { quoted: quoteThis });
    const mentionMsg = quoteThis.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || quoteThis.message?.extendedTextMessage?.contextInfo?.participant;
    const mentionCitadaMsg = !!quoteThis.message?.extendedTextMessage?.contextInfo?.participant;
    if (!mentionMsg) return await kill.sendMessage(chatId, { text: `[CMD]: ${prefix}dellast @users/Message <quantidades>\n\n> Marque a pessoa que deseja que eu faça isso!`, }, { quoted: quoteThis });
    const quantidadesMsg = mentionCitadaMsg ? parseInt(args[0]) : parseInt(args[1]);
    if (isNaN(quantidadesMsg) || quantidadesMsg < 1 || quantidadesMsg > 20) return await kill.sendMessage(chatId, { text: `[CMD]: ${prefix}dellast @users/Message <quantidades>\n\n` + 'Por favor, forneça um número de mensagens válido para deletar (de 1 a 20).', }, { quoted: quoteThis });

    try {
        const resultcheck = await getAllMessagesInChat(mentionMsg, quantidadesMsg);
        if (!Array.isArray(resultcheck) || resultcheck.length === 0) return await kill.sendMessage(chatId, { text: 'Nenhuma mensagem encontrada para deletar.', }, { quoted: quoteThis });
        for (const idMsg of resultcheck) {
            if (!idMsg) {
                console.warn('ID de mensagem inválido:', idMsg);
                continue;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Intervalo de 1 segundo e 1000 milissegundos
            kill.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: idMsg, participant: mentionMsg } });
        }
        // await kill.sendMessage(chatId, { text: 'Mensagens do histórico de conversas recentes foram apagadas com sucesso', }, { quoted: quoteThis });
    } catch (error) {
        console.error('Erro ao tentar deletar as mensagens:', error);
        await kill.sendMessage(chatId, { text: 'Erro ao tentar deletar as mensagens: ' + error.message, }, { quoted: quoteThis });
    }
    break;

/* const { CheckMessage } = require('arquivo'); // Certifique-se de que o caminho do arquivo esteja correto

case 'historico':
    // Se for para membros ou somente administradores, poderão usar os comandos que quiserem
    // if (!isGroupAdmins) return  await kill.sendMessage(chatId, { text: 'Você não é um administrador desde grupos.', }, { quoted: quoteThis });
        const mentionMsg = quoteThis.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || quoteThis.message?.extendedTextMessage?.contextInfo?.participant;
        CheckMessage(mentionMsg).then(messages => {
            if (messages.length === 0) {
                await kill.sendMessage(chatId, { text: 'Nenhuma mensagem encontrada para este usuário.', }, { quoted: quoteThis });
            } else {
                await kill.sendMessage(chatId, { text: `*HISTORICO MENSAGEMS CONVERSAR*\n${messages.join('\n')}`, }, { quoted: quoteThis });
            }
        }).catch(err => {
            console.error('Erro ao obter mensagens:', err);
            await kill.sendMessage(chatId, { text: 'Erro ao recuperar mensagens.', }, { quoted: quoteThis });
        });
    break;

*/

module.exports = { addMessage, checkDeletedMessage, CheckMessage, getAllMessagesInChat };
