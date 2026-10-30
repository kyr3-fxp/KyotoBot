import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageHandler } from './handler.js';
import { db } from './database.js';
import {
  antiDeleteTracker,
  handleMessagesUpdate,
  handleUpsertAntiDelete
} from './utils/antiDelete.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FOLDER = path.join(__dirname, '..', 'auth_info');

// Filtrar mensajes de error internos de libsignal (Bad MAC, MessageCounterError al recibir historial antiguo)
const originalConsoleError = console.error;
console.error = (...args) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : '';
  if (
    firstArg.includes('Failed to decrypt message with any known session') ||
    firstArg.includes('Session error:Error: Bad MAC') ||
    firstArg.includes('Bad MAC') ||
    firstArg.includes('MessageCounterError') ||
    firstArg.includes('Key used already or never filled')
  ) {
    // Ignorar silenciosamente errores de descifrado de chats históricos no sincronizados
    return;
  }
  originalConsoleError(...args);
};

// Inicializar el despachador de comandos
const handler = new MessageHandler({ prefix: '!' });

// Prevenir caídas no deseadas ante errores no capturados
process.on('uncaughtException', (err) => {
  if (err?.message?.includes('Bad MAC') || err?.message?.includes('MessageCounterError')) return;
  console.error('[Excepción no capturada]:', err);
});

process.on('unhandledRejection', (reason) => {
  if (reason?.message?.includes('Bad MAC') || reason?.message?.includes('MessageCounterError')) return;
  console.error('[Rechazo de promesa no controlado]:', reason);
});

async function startBot() {
  console.log('\n=============================================');
  console.log('🤖 Iniciando Bot de WhatsApp (Kyoto)...');
  console.log('=============================================');

  // Asegurar que los comandos estén cargados
  await handler.loadCommands();

  // Configuración de almacenamiento de sesión multi-dispositivo con caché de llaves en memoria
  const logger = pino({ level: 'silent' });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  // Cache para reintentos de mensajes de Signal (con TTL de 5 minutos para liberar memoria)
  const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

  // Instanciar socket de WhatsApp optimizado para estabilidad continua
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterCache,
    logger,
    printQRInTerminal: false,
    browser: ['KyotoBot', 'Chrome', '1.0.0'],
    syncFullHistory: false, // Evitar la descarga masiva de historial antiguo que satura el descifrado
    shouldSyncHistoryMessage: () => false, // No intentar descifrar mensajes previos a la conexión del bot
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    defaultQueryTimeoutMs: 60000,
    getMessage: async (key) => {
      // Proveer mensajes recientes en caso de que WhatsApp solicite reintento
      return antiDeleteTracker.getMessage(key);
    }
  });

  // Guardar credenciales de sesión automáticamente
  sock.ev.on('creds.update', saveCreds);

  // Manejar el ciclo de vida de la conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Desplegar código QR en la consola si es necesario
    if (qr) {
      console.log('\n📱 [CÓDIGO QR GENERADO]');
      console.log('Escanea el siguiente código con WhatsApp: (Dispositivos vinculados -> Vincular un dispositivo)\n');
      qrcode.generate(qr, { small: true });
      console.log('\nEsperando escaneo del código QR...\n');
    }

    // Notificar apertura de sesión exitosa
    if (connection === 'open') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ¡Conexión establecida con éxito!');
      console.log(`🤖 Bot conectado como: ${sock.user?.id || 'Desconocido'} (${sock.user?.name || ''})`);
      console.log(`🤖 Escuchando mensajes con el prefijo "${handler.prefix}"`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Manejar desconexiones y reconexiones automáticas
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.warn(`[Conexión cerrada] Razón: ${lastDisconnect?.error?.message || 'Desconocida'} (Código: ${statusCode})`);

      try {
        sock.ws?.close();
        sock.ev?.removeAllListeners();
      } catch (e) {
        // Ignorar error al limpiar socket previo
      }

      if (!isLoggedOut) {
        console.log('🔄 Reconectando de forma limpia en 3 segundos...');
        // Si corre bajo PM2, salir permite que PM2 inicie un proceso nuevo y limpio
        if (process.env.pm_id !== undefined) {
          process.exit(1);
        } else {
          setTimeout(() => {
            startBot();
          }, 3000);
        }
      } else {
        console.error('🚫 Sesión cerrada desde el dispositivo móvil. Elimina la carpeta "auth_info" y vuelve a iniciar para escanear un nuevo código QR.');
      }
    }
  });

  // Escuchar actualizaciones de mensajes (detección de mensajes eliminados / editados)
  sock.ev.on('messages.update', async (updates) => {
    await handleMessagesUpdate(sock, updates);
  });

  // Escuchar mensajes entrantes, guardarlos para reintentos y procesarlos con el manejador
  sock.ev.on('messages.upsert', async (m) => {
    console.log(`[UPSERT] Tipo: ${m.type} | Mensajes recibidos: ${m.messages?.length || 0}`);
    if (m.messages) {
      for (const msg of m.messages) {
        if (msg.key && msg.message) {
          await handleUpsertAntiDelete(sock, msg);
        }
      }
    }
    await handler.handleMessages(sock, m);
  });

  // Manejar bienvenida para nuevos participantes de grupos
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;
      if (action === 'add') {
        const groupConfig = db.getGroup(id);
        if (groupConfig.welcome) {
          for (const num of participants) {
            const cleanNum = num.split(':')[0].split('@')[0];
            await sock.sendMessage(id, {
              text: `👋 ¡Bienvenido/a al grupo @${cleanNum}! 🎉\nDisfruta de tu estadía y consulta los comandos usando *${handler.prefix}help*.`,
              mentions: [num]
            });
          }
        }
      }
    } catch (err) {
      console.error('[Welcome Event Error]', err);
    }
  });
}

// Iniciar aplicación
startBot();
