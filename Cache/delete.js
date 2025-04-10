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
        // Criação das tabelas
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                user TEXT,
                time INTEGER,
                body TEXT,
                type TEXT,
                status INTEGER
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela messages:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS messageEdits (
                messageId TEXT,
                oldBody TEXT,
                newBody TEXT,
                time INTEGER,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela messageEdits:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS imagens (
                messageId TEXT,
                caption TEXT,
                mimetype TEXT,
                width INTEGER,
                height INTEGER,
                mediaKeyTimestamp INTEGER,
                jpegThumbnail BLOB,
                contextInfo TEXT,
                uploaded BLOB,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela imagens:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS videos (
                messageId TEXT,
                mimetype TEXT,
                seconds INTEGER,
                gifPlayback INTEGER,
                caption TEXT,
                height INTEGER,
                width INTEGER,
                mediaKeyTimestamp INTEGER,
                jpegThumbnail BLOB,
                gifAttribution INTEGER,
                contextInfo TEXT,
                uploaded BLOB,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela videos:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS audios (
                messageId TEXT,
                mimetype TEXT,
                seconds INTEGER,
                mediaKeyTimestamp INTEGER,
                waveform BLOB,
                contextInfo TEXT,
                uploaded BLOB,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela audios:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS documentos (
                messageId TEXT,
                title TEXT,
                data BLOB,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela documentos:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS stickers (
                messageId TEXT,
                mimetype TEXT,
                mediaKeyTimestamp INTEGER,
                isAnimated INTEGER,
                isAvatar INTEGER,
                isAiSticker INTEGER,
                isLottie INTEGER,
                contextInfo TEXT,
                uploaded BLOB,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela stickers:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS vcards (
                messageId TEXT,
                data TEXT,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela vcards:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS locations (
                messageId TEXT,
                latitude REAL,
                longitude REAL,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela locations:', err.message);
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS visualizacoes (
                messageId TEXT,
                data BLOB,
                acaos INTEGER,
                FOREIGN KEY (messageId) REFERENCES messages(id)
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela visualizacoes:', err.message);
                }
            });
        });
    }
});

// Função para verificar e excluir contas inativas (últimos 5 dias)
function deleteInactiveUsersRealTime() {
    const currentTime = Date.now();
    const fiveDaysInMilliseconds = 5 * 24 * 60 * 60 * 1000; // 5 dias em milissegundos

    db.serialize(() => {
        db.all(
            'SELECT DISTINCT user, MAX(time) as lastActivity FROM messages GROUP BY user HAVING ? - lastActivity > ?',
            [currentTime, fiveDaysInMilliseconds],
            (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar usuários inativos:', err.message);
                    return;
                }

                if (rows && rows.length > 0) {
                    rows.forEach((row) => {
                        const { user } = row;

                        if (!user) return;
                        console.log(`[LIMPEZA] Excluindo dados do usuário inativo: ${user}`);
                        db.run('DELETE FROM messages WHERE user = ?', [user], (err) => {
                            if (err) {
                                console.error(`[ERRO] Falha ao excluir dados do usuário ${user}:`, err.message);
                            } else {
                                console.log(`[SUCESSO] Dados do usuário ${user} excluídos.`);
                            }
                        });
                    });
                }
            },
        );
    });
}

function addMessage(user, id, body, type, status) {
    db.serialize(() => {
        db.get('SELECT id FROM messages WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error(`[ERRO] Falha ao verificar mensagem do usuário ${user}:`, err.message);
                return;
            }

            if (row) {
                // Atualiza a mensagem existente
                db.run(
                    'UPDATE messages SET body = ?, type = ?, time = ?, status = ? WHERE id = ?',
                    [body, type, Date.now(), status, id],
                    (err) => {
                        if (err) {
                            console.error(`[ERRO] Falha ao atualizar mensagem do usuário ${user}:`, err.message);
                        }
                    },
                );
            } else {
                // Adiciona uma nova mensagem, limitando a 200 por usuário
                db.get('SELECT COUNT(*) as count FROM messages WHERE user = ?', [user], (err, row) => {
                    if (err) {
                        console.error(`[ERRO] Falha ao contar mensagens do usuário ${user}:`, err.message);
                        return;
                    }
                    if (row.count >= 200) {
                        // Exclui a mensagem mais antiga se houver mais de 200
                        db.run('DELETE FROM messages WHERE id IN (SELECT id FROM messages WHERE user = ? ORDER BY time ASC LIMIT 1)', [user], (err) => {
                            if (err) {
                                console.error(`[ERRO] Falha ao excluir mensagem antiga do usuário ${user}:`, err.message);
                            }
                        });
                    }

                    // Insere ou substitui a mensagem
                    db.run('REPLACE INTO messages (id, user, time, body, type, status) VALUES (?, ?, ?, ?, ?, ?)', [id, user, Date.now(), body, type, status], (err) => {
                        if (err) {
                            console.error(`[ERRO] Falha ao inserir mensagem do usuário ${user}:`, err.message);
                        } else {
                            deleteInactiveUsersRealTime();
                        }
                    });
                });
            }
        });
    });
}

/* function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} */

function addEditMessage(messageId, oldBody, newBody) {
    db.run('INSERT INTO messageEdits (messageId, oldBody, newBody, time) VALUES (?, ?, ?, ?)', [messageId, oldBody, newBody, Date.now()], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir mensagem editada:', err.message);
        }
    });
}

function addImage(messageId, upload, imageMessage) {
    db.run(`INSERT INTO imagens (
            messageId,
            caption,
            mimetype,
            width,
            height,
            mediaKeyTimestamp,
            contextInfo,
            jpegThumbnail,
            uploaded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        messageId,
        imageMessage.caption || '',
        imageMessage.mimetype || '',
        imageMessage.width || 0,
        imageMessage.height || 0,
        imageMessage.mediaKeyTimestamp?.toNumber?.() || 0,
        JSON.stringify(imageMessage.contextInfo) || null,
        Buffer.from(imageMessage.jpegThumbnail || []),
        upload], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir imagem:', err.message);
        }
    });
}

function addVideo(messageId, uploaded, videoMessage) {
    db.run(`INSERT INTO videos (
            messageId,
            mimetype,
            seconds,
            gifPlayback,
            caption,
            height,
            width,
            mediaKeyTimestamp,
            jpegThumbnail,
            gifAttribution,
            contextInfo,
            uploaded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        messageId,
        videoMessage.mimetype || '',
        videoMessage.seconds || 0,
        videoMessage.gifPlayback || 0,
        videoMessage.caption || '',
        videoMessage.height || 0,
        videoMessage.width || 0,
        videoMessage.mediaKeyTimestamp?.toNumber?.() || 0,
        Buffer.from(videoMessage.jpegThumbnail || []),
        videoMessage.gifAttribution || 0,
        JSON.stringify(videoMessage.contextInfo) || null,
        uploaded,
    ], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir vídeo:', err.message);
        }
    });
}

function addAudio(messageId, uploaded, audioMessage) {
    db.run(`INSERT INTO audios (
            messageId,
            mimetype,
            seconds,
            mediaKeyTimestamp,
            waveform,
            contextInfo,
            uploaded
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        messageId,
        audioMessage.mimetype || '',
        audioMessage.seconds || 0,
        audioMessage.mediaKeyTimestamp?.toNumber?.() || 0,
        Buffer.from(audioMessage.waveform || []),
        JSON.stringify(audioMessage.contextInfo) || null,
        uploaded,
    ], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir áudio:', err.message);
        }
    });
}

function addDocument(messageId, title, data) {
    db.run('INSERT INTO documentos (messageId, title, data) VALUES (?, ?, ?)', [messageId, title, data], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir documento:', err.message);
        }
    });
}

function addSticker(messageId, uploaded, stickerMessage) {
    db.run(`INSERT INTO stickers (
            messageId,
            mimetype,
            mediaKeyTimestamp,
            isAnimated,
            isAvatar,
            isAiSticker,
            isLottie,
            contextInfo,
            uploaded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        messageId,
        stickerMessage.mimetype || '',
        stickerMessage.mediaKeyTimestamp?.toNumber?.() || 0,
        stickerMessage.isAnimated || 0,
        stickerMessage.isAvatar || 0,
        stickerMessage.isAiSticker || 0,
        stickerMessage.isLottie || 0,
        JSON.stringify(stickerMessage.contextInfo) || null,
        uploaded,
    ], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir sticker:', err.message);
        }
    });
}

function addVCard(messageId, data) {
    db.run('INSERT INTO vcards (messageId, data) VALUES (?, ?)', [messageId, data], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir vcard:', err.message);
        }
    });
}

function addLocation(messageId, latitude, longitude) {
    db.run('INSERT INTO locations (messageId, latitude, longitude) VALUES (?, ?, ?)', [messageId, latitude, longitude], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir localização:', err.message);
        }
    });
}

function addVisualizacao(messageId, data, status) {
    db.run('INSERT INTO visualizacoes (messageId, data, acaos) VALUES (?, ?, ?)', [messageId, data, status], (err) => {
        if (err) {
            console.error('[ERRO] Falha ao inserir visualização:', err.message);
        }
    });
}

// Função auxiliar para buscar dados de mídia
function getMediaData(table, messageId) {
    return new Promise((resolve, reject) => {
        let query = '';

        switch (table) {
        case 'documentos':
            query = `SELECT title, data FROM ${table} WHERE messageId = ?`;
            break;
        case 'locations':
            query = `SELECT latitude, longitude FROM ${table} WHERE messageId = ?`;
            break;
        case 'vcards':
            query = `SELECT data FROM ${table} WHERE messageId = ?`;
            break;
        case 'visualizacoes':
            query = `SELECT data, acaos FROM ${table} WHERE messageId = ?`;
            break;
        default:
            // Para imagens, vídeos, áudios, stickers, etc.
            query = `SELECT * FROM ${table} WHERE messageId = ?`;
            break;
        }

        db.get(query, [messageId], (err, row) => {
            if (err) {
                console.error(`❌ Erro ao buscar dados da tabela '${table}':`, err.message);
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

// Função aprimorada para verificar mensagens deletadas, incluindo diferentes tipos de mídia
async function checkDeletedMessage(user, id) {
    try {
        const message = await new Promise((resolve, reject) => {
            db.get('SELECT id, user, time, body, type, status FROM messages WHERE id = ? AND user = ?', [id, user], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar mensagem:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!message) {
            return null;
        }

        let mediaData = null;
        switch (message.status) {
        case 1: // Imagem
            mediaData = await getMediaData('imagens', id);
            break;
        case 2: // Mensagem Editada
            mediaData = await new Promise((resolve, reject) => {
                db.get('SELECT oldBody, newBody FROM messageEdits WHERE messageId = ?', [id], (err, row) => {
                    if (err) {
                        console.error('Erro ao buscar dados de messageEdits:', err.message);
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                });
            });
            break;
        case 3: // Sticker
            mediaData = await getMediaData('stickers', id);
            break;
        case 4: // Vídeo
            mediaData = await getMediaData('videos', id);
            break;
        case 5: // Visualização
            mediaData = await getMediaData('visualizacoes', id);
            break;
        case 6: // Áudio
            mediaData = await getMediaData('audios', id);
            break;
        case 7: // Documento
            mediaData = await getMediaData('documentos', id);
            break;
        case 8: // VCard
            mediaData = await getMediaData('vcards', id);
            break;
        case 9: // Localização
            mediaData = await getMediaData('locations', id);
            break;
        default:
            break;
        }

        return {
            id: message.id,
            user: message.user,
            time: message.time,
            message: message.body,
            type: message.type,
            status: message.status,
            mediaData,
        };
    } catch (error) {
        console.error('Erro ao verificar mensagem deletada:', error);
        return null;
    }
}

// Função para formatar a data para o horário de Brasília
function formatDateToBrasilia(timestamp) {
    return moment(timestamp).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
}

function CheckMessage(user) {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, body, type, time, status FROM messages WHERE user = ?', [user], (err, rows) => {
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
                } else {
                    return `[${formattedTime}] ` + row.body;
                }
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

module.exports = {
    addMessage,
    addEditMessage,
    addImage,
    addVideo,
    addAudio,
    addDocument,
    addSticker,
    addVCard,
    addLocation,
    addVisualizacao,
    checkDeletedMessage,
    CheckMessage,
    getAllMessagesInChat,
};
