// bot.js - główny plik uruchamiający bota i integrujący moduły

require('dotenv').config();
const { connection, wallet, publicKey, getBalanceSol } = require('./wallet');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { startSniperMode, setMode } = require('./sniper');

// Pobierz konfiguracje z environment
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌ BOT_TOKEN lub CHAT_ID nie są ustawione w .env!");
  process.exit(1);
}

// Inicjalizacja bota Telegram
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
bot.on('polling_error', (error) => {
  console.error("Telegram polling error:", error.code ? error.code : error.message);
});

// Funkcja logująca (będzie używana także przez sniper.js)
const logs = [];  // przechowuje ostatnie logi
function logEvent(message, level = "INFO") {
  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS
  const tag = level ? `[${level}]` : "[INFO]";
  const logMessage = `${timestamp} ${tag} ${message}`;
  console.log(logMessage);
  logs.push(logMessage);
  if (logs.length > 1000) {
    logs.shift(); // utrzymuj max 1000 logów
  }
  // Wyślij log na kanał Telegram
  if (bot && CHAT_ID) {
    try {
      bot.sendMessage(parseInt(CHAT_ID), `${tag} ${message}`);
    } catch (err) {
      // Jeśli nie uda się wysłać (np. brak uprawnień), wypisz błąd do stderr
      console.error("Błąd wysyłania wiadomości Telegram:", err.message);
    }
  }
}

// Obsługa komend Telegram
bot.onText(/^\/start/, (msg) => {
  // Powitanie / instrukcja dla użytkownika
  bot.sendMessage(msg.chat.id, 
    "👋 Witaj! Jestem BoberSniperBot.\n" + 
    "Domyślnie działam w trybie SHADOW (symulacja).\n" + 
    "Dostępne komendy:\n" + 
    "/status - sprawdź status bota\n" + 
    "/live - przełącz w tryb rzeczywisty (LIVE)\n" + 
    "/shadow - powrót do trybu symulacji");
});

bot.onText(/^\/status/, (msg) => {
  // Zwróć status bota (tryb, statystyki)
  const mode = (sniperStatus.mode === 'live') ? 'LIVE (rzeczywisty)' : 'SHADOW (symulacja)';
  const stats = `Sukcesy: ${sniperStatus.successCount}, Porażki: ${sniperStatus.failCount}`;
  const filter = `Min. MC filtr: $${sniperStatus.minMarketCap}`;
  bot.sendMessage(msg.chat.id, `📊 Status: Tryb = ${mode}\n${stats}\n${filter}`);
});

bot.onText(/^\/live/, (msg) => {
  // Przełączenie na tryb LIVE
  setMode('live');
  bot.sendMessage(msg.chat.id, "✅ Bot przełączony w tryb LIVE. Uwaga: teraz transakcje będą realne!");
});

bot.onText(/^\/shadow/, (msg) => {
  // Przełączenie na tryb SHADOW (symulacja)
  setMode('shadow');
  bot.sendMessage(msg.chat.id, "✅ Bot przełączony w tryb SHADOW (symulacja).");
});

// Inicjalizacja modułu snajpera (start w trybie shadow)
startSniperMode(logEvent);

// Obiekt stanu snajpera do wykorzystania w /status (pobierany z modułu sniper)
const sniperStatus = require('./sniper_state') || {}; 
// Uwaga: sniper.js mogłby np. eksportować aktualny stan lub metodę getState(); 
// Dla uproszczenia załóżmy, że obiekt state jest eksportowany w require('./sniper_state') 
// (W razie czego można zmienić implementację by zwracała state)

// Logi początkowe (informacje o portfelu, RPC itp.)
logEvent(`🔑 Załadowano portfel: ${publicKey.toBase58()}`, "INFO");
getBalanceSol().then(balance => {
  if (balance !== null) {
    logEvent(`💰 Saldo portfela: ${balance.toFixed(3)} SOL`, "INFO");
  } else {
    logEvent("⚠️ Nie udało się pobrać salda portfela (sprawdź połączenie RPC).", "WARN");
  }
});

// Wyślij wiadomość na Telegram o starcie bota
logEvent("🤖 BoberSniperBot został uruchomiony w trybie SHADOW. Monitoring Pump.fun/Photon...", "INFO");

// Uruchomienie serwera HTTP (dashboard logów)
const app = express();
app.use(express.json());

// Endpoint główny - wyświetla logi
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const logContent = logs.slice().map(line => line.replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
  res.send(`<h2>BoberSniperBot Log Dashboard</h2><pre style="font-family: monospace;">${logContent}</pre>`);
});

// Endpoint opcjonalny, np. zdrowie/stan (można dodać /status w formacie JSON jeśli potrzebne)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: sniperStatus.mode || 'unknown' });
});

// Nasłuchuj na porcie (Render korzysta z process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Dashboard serwera działa na porcie ${PORT}`);
});
// Placeholder content for bot.js
