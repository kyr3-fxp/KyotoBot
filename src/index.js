import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import readline from 'readline';
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
const AUTH_FOLDER = process.env.BOT_AUTH_DIR || path.join(__dirname, '..', 'auth_info');

// Interfaz interactiva de consola para solicitar número si se usa vinculación por código
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Si se pasa --code o USE_PAIRING_CODE=true en variables de entorno / flags
const usePairingCode = process.argv.includes('--code') || process.env.USE_PAIRING_CODE === 'true';

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
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
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

  // Solicitar código de vinculación de 8 dígitos si se ejecuta con --code y no hay sesión previa
  if (usePairingCode && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let phoneNumber = process.env.BOT_PHONE || '';
        if (!phoneNumber) {
          phoneNumber = await question('📱 Ingresa tu número de WhatsApp con código de país (ej. 573001234567): ');
        }
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (phoneNumber) {
          const code = await sock.requestPairingCode(phoneNumber);
          const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log('\n=============================================');
          console.log(`🔑 CÓDIGO DE VINCULACIÓN: \x1b[32m\x1b[1m${formattedCode}\x1b[0m`);
          console.log('=============================================');
          console.log('Ingresa a: WhatsApp -> Dispositivos vinculados -> Vincular con el número de teléfono\n');
        } else {
          console.error('❌ Número inválido.');
        }
      } catch (err) {
        console.error('❌ Error al generar el código de vinculación:', err);
      }
    }, 3000);
  }

  // Manejar el ciclo de vida de la conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Desplegar código QR en la consola si es necesario (solo si no se usa código de vinculación)
    if (qr && !usePairingCode) {
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
      const disconnectMessage = lastDisconnect?.error?.message || 'Desconocida';
      // Baileys sometimes reports a transient "Stream Errored (conflict)" as 401.
      // Only treat 401 as a revoked session when it is not this known conflict case.
      const isConflict = /\bconflict\b/i.test(disconnectMessage);
      const isLoggedOut = statusCode === DisconnectReason.loggedOut && !isConflict;

      console.warn(`[Conexión cerrada] Razón: ${disconnectMessage} (Código: ${statusCode})`);

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
        console.error('🚫 WhatsApp rechazó la sesión (401). No se borró "auth_info". Revisa Dispositivos vinculados en el teléfono; si el dispositivo fue desvinculado, respalda "auth_info" antes de volver a vincularlo.');
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
