const {Connection,LAMPORTS_PER_SOL}=require('@solana/web3.js');const {load}=require('./keys');
(async()=>{const c=new Connection((process.env.RPC||'https://rpc.ankr.com/solana_devnet'),'confirmed');
for(const n of ['treasury','player']){const k=load(n);let b=await c.getBalance(k.publicKey);
 if(b<0.5*LAMPORTS_PER_SOL){try{const s=await c.requestAirdrop(k.publicKey,LAMPORTS_PER_SOL);await c.confirmTransaction(s);console.log(n,'airdrop',s);}catch(e){console.log(n,'airdrop failed',e.message.slice(0,120));}}
 b=await c.getBalance(k.publicKey);console.log(n,k.publicKey.toBase58(),b/LAMPORTS_PER_SOL);}})();
