// wallet.js - konfiguracja portfela i połączenia z Solana

const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();  // Załaduj zmienne środowiskowe

// Ustawienie RPC (domyślnie mainnet-beta, można nadpisać .env)
const rpcUrl = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
const connection = new Connection(rpcUrl, 'confirmed');

// Wczytanie prywatnego klucza portfela
const secret = process.env.PRIVATE_KEY;
if (!secret) {
  throw new Error("Brak ustawionego PRIVATE_KEY w konfiguracji!");
}
let wallet;
try {
  if (secret.trim().startsWith('[')) {
    // Formatuj jako JSON array
    const secretArray = JSON.parse(secret);
    wallet = Keypair.fromSecretKey(Uint8Array.from(secretArray));
  } else {
    // Traktuj jako base58
    const secretKeyBytes = bs58.decode(secret.trim());
    wallet = Keypair.fromSecretKey(secretKeyBytes);
  }
} catch (e) {
  throw new Error("Nieudane wczytanie klucza prywatnego. Sprawdź format PRIVATE_KEY.");
}

// Eksportuj połączenie i portfel
const publicKey = wallet.publicKey;
module.exports = {
  connection,
  wallet,
  publicKey,
  // funkcja pomocnicza do pobrania salda (w SOL)
  getBalanceSol: async () => {
    try {
      const lamports = await connection.getBalance(publicKey);
      return lamports / 1e9;  // 1 SOL = 1e9 lamports
    } catch {
      return null;
    }
  }
};
