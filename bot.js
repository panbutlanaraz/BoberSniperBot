// bot.js – GŁÓWNY PLIK URUCHAMIAJĄCY BOBERSNIPERBOT
require('dotenv').config();
const { connection, wallet, publicKey, getBalanceSol } = require('./wallet/wallet');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { startSniperMode, setMode } = require('./bot/sniper');

// === 🔐 KONFIGURACJA
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌ BOT_TOKEN lub CHAT_ID nie są ustawione w pliku .env");
  process.exit(1);
}

// === 🤖 TELEGRAM BOT
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on('polling_error', (err) => {
  console.error("❗ Błąd Telegram:", err.message);
});

// === 📝 SYSTEM LOGÓW
const logs = [];
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
  const entry = `${timestamp} [${level}] ${message}`;
  console.log(entry);
  logs.push(entry);
  if (logs.length > 1000) logs.shift();
  try {
    bot.sendMessage(CHAT_ID, entry);
  } catch (err) {
    console.error("❗ Błąd wysyłania do Telegrama:", err.message);
  }
}

// === 📡 OBSŁUGA KOMEND TELEGRAM
bot.onText(/^\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Witaj! Bot aktywny. Komendy: /status /live /shadow");
});
bot.onText(/^\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, "📊 Bot działa. Tryb: SHADOW. Logi: dostępne w dashboardzie.");
});
bot.onText(/^\/live/, (msg) => {
  setMode('live');
  bot.sendMessage(msg.chat.id, "⚠️ Przełączono w tryb LIVE! Transakcje będą rzeczywiste.");
});
bot.onText(/^\/shadow/, (msg) => {
  setMode('shadow');
  bot.sendMessage(msg.chat.id, "🔁 Przełączono z powrotem do trybu SHADOW (symulacja).");
});
bot.onText(/^\/stop/, (msg) => {
  stopSniper();
  bot.sendMessage(msg.chat.id, "🛑 Bot zatrzymany.");
});

bot.onText(/^\/stats/, (msg) => {
  const s = getStats();
  bot.sendMessage(msg.chat.id,
    `📈 Statystyki:\n` +
    `Wykryte tokeny: ${s.totalDetected}\n` +
    `Zakupione: ${s.totalBought}\n` +
    `Odrzucone: ${s.totalSkipped}\n` +
    `Zainwestowano: ${s.totalInvested.toFixed(4)} SOL\n` +
    `Zysk (symulowany): ${s.totalProfit.toFixed(4)} SOL`
  );
});

// === 🔧 STATUS PORTFELA
log(`🔑 Adres portfela: ${publicKey.toBase58()}`);
getBalanceSol().then((bal) => {
  log(`💰 Saldo portfela: ${bal.toFixed(4)} SOL`);
}).catch(() => {
  log("⚠️ Nie udało się pobrać salda portfela", "WARN");
});

// === 🚀 STARTUJEMY MODUŁ SNAJPERA
startSniperMode(log);
log("🤖 Bot uruchomiony. Tryb: SHADOW. Gotowy do działania.");

// === 🌐 DASHBOARD WWW (logi)
const app = express();
app.get('/', (req, res) => {
  const html = logs.map(l => `<div style="font-family: monospace;">${l}</div>`).join('');
  res.send(`<h2>BoberSniperBot Logs</h2>${html}`);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Dashboard online: http://localhost:${PORT}/`);
});
