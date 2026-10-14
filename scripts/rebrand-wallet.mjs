// Testnet-only rehearsal wallets. Never prints keys; local role files are gitignored.
import {readFileSync,writeFileSync,existsSync,mkdirSync,rmdirSync} from 'node:fs';
import {privateKeyToAccount,generatePrivateKey} from 'viem/accounts';
import {createPublicClient,createWalletClient,http,parseEther,formatEther} from 'viem';
import {arcChain,STEALTH_KEYS_MESSAGE,generateStealthKeys,scanAnnouncements} from '../packages/sdk/src/index.ts';
import assert from 'node:assert/strict';
const chain=arcChain('testnet'),client=createPublicClient({chain,transport:http()});
const deployerAddress='0x0648aDF1967692A0c991d7715b0b588452321FBd';
const file='.run/rebrand.env';
export async function withBroadcastLock(fn){
 const lock='../.deployer/lock';let acquired=false;
 for(let i=0;i<60;i++){try{mkdirSync(lock);acquired=true;break;}catch(e){if(e.code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,1000));}}
 assert(acquired,'Shared broadcast lock unavailable');
 try{return await fn();}finally{rmdirSync(lock);}
}
async function main(){
 assert.equal(await client.getChainId(),5042002);mkdirSync('.run',{recursive:true});
 if(process.argv[2]==='fund'){
  assert(!existsSync(file),'Rehearsal keys already exist; refusing duplicate funding');
  const full=process.env.ALLOW_ONE_USDC_DEPOSIT==='1';
  const payerKey=generatePrivateKey(),recipientKey=generatePrivateKey();
  writeFileSync(file,`PAYER_KEY=${payerKey}\nRECIPIENT_KEY=${recipientKey}\n`,{mode:0o600});
  const to=privateKeyToAccount(payerKey).address;
  const key=/^DEPLOYER_PRIVATE_KEY=(0x[\da-fA-F]{64})/m.exec(readFileSync('../.deployer/deployer.env','utf8'))?.[1];
  const account=privateKeyToAccount(key);assert.equal(account.address.toLowerCase(),deployerAddress.toLowerCase());
  const value=parseEther(full?'1.10':'0.08');
  const result=await withBroadcastLock(async()=>{
   const gas=await client.estimateGas({account,to,value});const gasPrice=await client.getGasPrice();assert(gas*gasPrice<parseEther('0.01'));
   const hash=await createWalletClient({chain,account,transport:http()}).sendTransaction({to,value,gas,gasPrice});
   const r=await client.waitForTransactionReceipt({hash});assert.equal(r.status,'success');
   return {payer:to,chainId:chain.id,hash,fundedUsdc:formatEther(value),gasUsdc:formatEther(r.gasUsed*r.effectiveGasPrice),scope:full?'1 USDC principal with <=0.5 USDC net budget':'<=0.5 USDC gross budget; payment only'};
  });
  writeFileSync('.run/rebrand-funding.json',JSON.stringify(result,null,2)+'\n');console.log('Funded testnet rehearsal',result.hash);return;
 }
 assert.equal(process.argv[2],'sweep','Use fund or sweep');
 const env=readFileSync(file,'utf8');const key=n=>new RegExp('^'+n+'=(0x[\\da-fA-F]{64})$','m').exec(env)?.[1];
 const payer=privateKeyToAccount(key('PAYER_KEY')),recipient=privateKeyToAccount(key('RECIPIENT_KEY'));
 const accounts=[payer,recipient];
 if(existsSync('.run/rebrand-live-results.json')){
  const live=JSON.parse(readFileSync('.run/rebrand-live-results.json','utf8'));
  if(live.transactions.length){
   const from=(await client.getTransactionReceipt({hash:live.transactions[0].hash})).blockNumber;
   const keys=generateStealthKeys(await payer.signMessage({message:STEALTH_KEYS_MESSAGE}));
   const d=JSON.parse(readFileSync('deployments/arc-testnet.json','utf8'));
   const matches=await scanAnnouncements(client,d.stealthAnnouncer,from,await client.getBlockNumber(),keys);
   accounts.unshift(...matches.filter(m=>m.stealthPrivateKey).map(m=>privateKeyToAccount(m.stealthPrivateKey)));
  }
 }
 const result={chainId:chain.id,transactions:[],dust:[]};
 for(const account of accounts){
  const balance=await client.getBalance({address:account.address});if(!balance){result.dust.push({address:account.address,balanceUsdc:'0'});continue;}
  await withBroadcastLock(async()=>{
   const gasPrice=await client.getGasPrice(),gas=await client.estimateGas({account,to:deployerAddress,value:1n});
   if(balance<=gas*gasPrice){result.dust.push({address:account.address,balanceUsdc:formatEther(balance)});return;}
   const value=balance-gas*gasPrice;
   const hash=await createWalletClient({chain,account,transport:http()}).sendTransaction({to:deployerAddress,value,gas,gasPrice});
   const r=await client.waitForTransactionReceipt({hash});assert.equal(r.status,'success');
   result.transactions.push({address:account.address,hash,returnedUsdc:formatEther(value),gasUsdc:formatEther(r.gasUsed*r.effectiveGasPrice)});
  });
  writeFileSync('.run/rebrand-sweep.json',JSON.stringify(result,null,2)+'\n');
 }
 writeFileSync('.run/rebrand-sweep.json',JSON.stringify(result,null,2)+'\n');console.log('Rehearsal balances recovered');
}
if(import.meta.url===new URL(process.argv[1],'file://'+process.cwd()+'/').href){main().catch(()=>{console.error('Testnet wallet operation failed; inspect local receipt files. Sensitive error details suppressed.');process.exitCode=1;});}
