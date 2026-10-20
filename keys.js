// Keypairs come from env (TREASURY_SECRET as a JSON byte array) in hosted deployments,
// or from a local, gitignored .keys/ folder for development. Values are never logged.
const fs=require('fs'),{Keypair}=require('@solana/web3.js');
function load(name){const env=process.env[name.toUpperCase()+'_SECRET'];
  if(env)return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env)));
  const dir=process.env.KEYS_DIR||__dirname+'/.keys';fs.mkdirSync(dir,{recursive:true,mode:0o700});const p=dir+'/'+name+'.json';
  if(!fs.existsSync(p))fs.writeFileSync(p,JSON.stringify([...Keypair.generate().secretKey]),{mode:0o600});
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p))));}
module.exports={load};
