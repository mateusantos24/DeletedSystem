![Banner](https://i.ibb.co/1bD6P3f/image.jpg)

# Bot Anti-Deletado para WhatsApp

Este é um script para monitoramento e gerenciamento de mensagens deletadas/editadas no WhatsApp utilizando a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys).

### Desenvolvedor
Desenvolvido por **Rei Ayanami**  
Baseado no projeto Iris de **[KillovSky](https://github.com/KillovSky)**.  
© 2024 Rei Ayanami. Todos os direitos reservados.

### Agradecimentos
Agradecimento ao **[KillovSky](https://github.com/KillovSky)** pela base de código e tutoriais.

### Como Integrar
Este bot integra-se ao **Bot Hanako-Kun** na versão Iris - [GitHub Iris](https://github.com/KillovSky/iris), e suporta a execução deste arquivo.

### Instruções de Instalação

1. **Página 1 - Configuração do Comando**
   - Vá até o arquivo `Bot/lib/Commands/Main/Construct/index.js`.
   - Na linha 934, cole o seguinte código:  
     `await Indexer('deleted').execute(kill, messageData);`
   
   ![1](https://i.ibb.co/cc46vd9/Captura-de-tela-2024-11-20-015953.png)

2. **Página 2 - Configuração do Symlink**
   - Vá até o arquivo `Bot/lib/Databases/Configurations/symlinks.json`.
   - Adicione o seguinte código:
   
   ![2](https://i.ibb.co/jrthttS/Captura-de-tela-2024-11-20-020427.png)
   
     ```json
     "Deleted": {
         "place": "./Commands/Main/Deleted",
         "alias": [
             "deleted",
             "antidelete",
             "deletado"
         ]
     }
     ```

### Funcionalidade

Este script utiliza o [Baileys](https://github.com/WhiskeySockets/Baileys) para detectar mensagens deletadas ou editadas no WhatsApp. Quando uma mensagem é editada ou deletada, o bot envia um alerta com os detalhes da mensagem original e a nova mensagem (no caso de edição). O bot também lida com diferentes tipos de mídia, como imagens, vídeos, áudios e documentos.

### Como Funciona

- **Monitoramento de mensagens deletadas**: Se uma mensagem for deletada, o bot detecta e envia um alerta com o conteúdo da mensagem.
- **Monitoramento de mensagens editadas**: Se uma mensagem for editada, o bot detecta e envia um alerta com a versão original e a versão editada.
- **Suporte para diferentes tipos de mídia**: O bot consegue monitorar e reagir a mensagens de texto, imagens, vídeos, áudios, stickers, vcards, localização e outros tipos de mídia.

### Tipos de Mídia Suportados

- **Mensagens de texto** ✅
- **Mensagens editadas** ❌
- **Stickers** ✅
- **Vídeos** ✅
- **Documentos** ✅
- **Visualizações** ❌
- **Áudios** ✅
- **Vcard** ✅
- **Localização** ❌
