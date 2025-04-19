"use strict";
const blindSignatures = require('blind-signatures');
const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// Generate the bank's key pair
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BigInt(BANK_KEY.keyPair.n);  // Ensure it's a BigInt
const E = BigInt(BANK_KEY.keyPair.e);

/**
 * Signs the coin on behalf of the bank.
 * @param {string} blindedCoinHash - The blinded hash of the coin.
 * @returns {string} - The bank's signature for this coin.
 */
function signCoin(blindedCoinHash) {
  let signature = blindSignatures.sign({
    blinded: blindedCoinHash,
    key: BANK_KEY,
  });
  console.log("Generated Signature:", signature);
  return signature;
}

/**
 * Parses a string representation of a coin and returns the left/right identity string hashes.
 * @param {string} s - String representation of a coin.
 * @returns {[string[], string[]]} - Two arrays of hashes representing the owner's identity.
 */
function parseCoin(s) {
  let [cnst, amt, guid, leftHashes, rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} (expected: ${BANK_STR})`);
  }
  return [leftHashes.split(','), rightHashes.split(',')];
}

/**
 * Accepts a coin and verifies its validity.
 * @param {Coin} coin - The coin being used for a transaction.
 * @returns {string[]} - An array of identity strings.
 */
function acceptCoin(coin) {
  console.log("\nVerifying the coin:");
  console.log("Blinded Message:", coin.blinded);
  console.log("Signature:", coin.signature);
  console.log("N:", coin.n);
  console.log("E:", coin.e);
  console.log("Blinding Factor:", coin.blindingFactor);

  // Verify the coin's signature
  let isValid = blindSignatures.verify({
    unblinded: coin.signature,
    N: BigInt(coin.n),
    E: BigInt(coin.e),
    message: coin.toString(),
  });

  if (!isValid) {
    throw new Error("Invalid coin signature!");
  }

  let [lh, rh] = parseCoin(coin.toString());
  return Math.random() < 0.5 ? lh : rh;
}

/**
 * Detects if a coin has been double-spent and identifies the cheater.
 * @param {string} guid - The unique identifier for the coin.
 * @param {string[]} ris1 - Identity string reported by the first merchant.
 * @param {string[]} ris2 - Identity string reported by the second merchant.
 */
function determineCheater(guid, ris1, ris2) {
  console.log(`\nChecking double-spending for GUID: ${guid}`);

  for (let i = 0; i < ris1.length; i++) {
    if (ris1[i] !== ris2[i]) {
      if (ris1[i].startsWith(IDENT_STR)) {
        console.log(`The cheater is the coin owner! ID: ${ris1[i].substring(IDENT_STR.length)}`);
      } else {
        console.log("The merchant is the cheater!");
      }
      return;
    }
  }
  console.log("No cheating detected.");
}

// Create a new coin by Alice
let coin = new Coin('alice', 20, N, E);

// Sign the coin
coin.signature = signCoin(coin.blinded);

// Unblind the signature
coin.unblind();

// First merchant accepts the coin
let ris1 = acceptCoin(coin);

// Second merchant accepts the same coin
let ris2 = acceptCoin(coin);

// Detect if double-spending occurred
determineCheater(coin.guid, ris1, ris2);

// Test case where the merchant is the cheater
console.log();
determineCheater(coin.guid, ris1, ris1);
