// Solana helpers. RPC defaults to a local test validator; set RPC=https://api.devnet.solana.com for devnet.
// Refuses to run against mainnet.
const web3=require('@solana/web3.js'),spl=require('@solana/spl-token'),fs=require('fs');
const {load}=require('./keys');
const RPC=process.env.RPC||'http://127.0.0.1:8899';
// Mainnet needs both CLUSTER=mainnet-beta and ALLOW_MAINNET=1, so a stray RPC URL can never move real SOL.
const CLUSTER=process.env.CLUSTER||(/127\.0\.0\.1|localhost/.test(RPC)?'localnet':/mainnet/i.test(RPC)?'mainnet-beta':'devnet');
const MAINNET=CLUSTER==='mainnet-beta';
if(MAINNET&&process.env.ALLOW_MAINNET!=='1')throw new Error('Mainnet refused: set ALLOW_MAINNET=1 together with CLUSTER=mainnet-beta.');
if(!MAINNET&&/mainnet/i.test(RPC))throw new Error('RPC looks like mainnet but CLUSTER is '+CLUSTER+'.');
const conn=new web3.Connection(RPC,'confirmed');
const MEMO=new web3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const memoIx=(s,signer)=>new web3.TransactionInstruction({programId:MEMO,keys:[{pubkey:signer,isSigner:true,isWritable:false}],data:Buffer.from(s,'utf8')});
async function fund(kp,min=2){if(MAINNET)return; // no faucet on mainnet
  const b=await conn.getBalance(kp.publicKey);if(b<min*web3.LAMPORTS_PER_SOL){const s=await conn.requestAirdrop(kp.publicKey,5*web3.LAMPORTS_PER_SOL);await conn.confirmTransaction(s,'confirmed');return s;}}
async function send(ixs,signers){const tx=new web3.Transaction().add(...ixs);return web3.sendAndConfirmTransaction(conn,tx,signers,{commitment:'confirmed'});}
// Mainnet: the token is the pump.fun $SOUP mint (SOUP_MINT). We never create a mint there. Returns null until SOUP_MINT is set.
async function setupMint(treasury){if(MAINNET){const m=(process.env.SOUP_MINT||'').trim();if(!m)return null;const mint=new web3.PublicKey(m);const ai=await conn.getAccountInfo(mint);if(!ai)throw new Error('SOUP_MINT not found on chain');
    const ata=spl.getAssociatedTokenAddressSync(mint,treasury.publicKey,false,ai.owner);return {mint:mint.toBase58(),treasuryAta:ata.toBase58(),tokenProgram:ai.owner.toBase58()};}
  const p=(process.env.DATA_DIR||__dirname+'/data')+'/mint.json';
  if(fs.existsSync(p)){const m=JSON.parse(fs.readFileSync(p));try{await spl.getMint(conn,new web3.PublicKey(m.mint));return m;}catch(e){}}
  const mint=await spl.createMint(conn,treasury,treasury.publicKey,null,6);
  const ata=await spl.getOrCreateAssociatedTokenAccount(conn,treasury,mint,treasury.publicKey);
  const sig=await spl.mintTo(conn,treasury,mint,ata.address,treasury,1_000_000_000n*1_000_000n);
  const m={mint:mint.toBase58(),treasuryAta:ata.address.toBase58(),mintSig:sig};fs.writeFileSync(p,JSON.stringify(m,null,1));return m;}
module.exports={CLUSTER,MAINNET,web3,spl,conn,RPC,MEMO,memoIx,fund,send,setupMint,load};
