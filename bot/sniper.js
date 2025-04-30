// bot/sniper.js – logika działania BoberSniperBot
const { buyTokenLive, buyTokenShadow } = require('./trading');
const sources = require('./sources'); // funkcje pobierania danych z Pump.fun, Photon
const tokenFilter = require('./filters');
const wallet = require('../wallet/wallet');

let mode = 'shadow'; // Domyślny tryb
let running = true;

// Statystyki
const stats = {
  totalDetected: 0,
  totalBought: 0,
  totalSkipped: 0,
  totalInvested: 0,
  totalProfit: 0
};

function setMode(newMode) {
  if (newMode === 'live' || newMode === 'shadow') {
    mode = newMode;
    console.log(`🔁 Tryb ustawiony na: ${mode.toUpperCase()}`);
  }
}

function getMode() {
  return mode;
}

function stopSniper() {
  running = false;
  console.log("🛑 Bot zatrzymany.");
}

function getStats() {
  return { ...stats };
}

async function startSniperMode(logFn) {
  logFn(`🚀 Startuję snajpera w trybie ${mode.toUpperCase()}...`);

  while (running) {
    try {
      const newTokens = await sources.fetchNewTokens();
      for (const token of newTokens) {
        stats.totalDetected++;

        const pass = tokenFilter(token);
        if (!pass) {
          stats.totalSkipped++;
          logFn(`🔥 Pomijam token ${token.name} – nie spełnia filtrów.`);
          continue;
        }

        logFn(`🚀 [${mode.toUpperCase()}] Wykonuję zakup tokena ${token.name}...`);

        let result;
        if (mode === 'live') {
          result = await buyTokenLive(token);
        } else {
          result = await buyTokenShadow(token);
        }

        if (result.success) {
          stats.totalBought++;
          stats.totalInvested += result.spent;
          stats.totalProfit += result.profit || 0;
          logFn(`✅ [${mode.toUpperCase()}] Zakup tokena ${token.name} – zakończony.`);
        } else {
          logFn(`❌ Nie udało się kupić tokena ${token.name}.`);
        }
      }
    } catch (err) {
      logFn(`❗ Błąd snajpera: ${err.message}`, 'ERROR');
    }

    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 sek przerwy
  }
}

module.exports = {
  startSniperMode,
  setMode,
  getMode,
  stopSniper,
  getStats
};
