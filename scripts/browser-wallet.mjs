/** Real Arc testnet UI rehearsal. Keys stay in Node; the page gets an EIP-1193 bridge.
 * Requires a built app at :9210 and relayer at :9202; never funds accounts automatically.
 * Open :9212 with Playwright. The proxy changes only the wallet provider reference,
 * avoiding installed-wallet interference; RPC, contracts and proof generation stay real.
 * Uses the existing ALICE_KEY test account and restricts writes to one 0.01 USDC pay,
 * one 1 USDC deposit, one registration and two exact approvals. Stop after testing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPublicClient, createWalletClient, http, formatEther, decodeFunctionData, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcChain, STEALTH_KEYS_MESSAGE } from '../packages/sdk/src/index.ts';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const env = readFileSync(resolve(root, '.run/testnet.env'), 'utf8');
const key = /^ALICE_KEY=(0x[0-9a-fA-F]{64})/m.exec(env)?.[1];
if (!key) throw Error('Missing test wallet');
const account = privateKeyToAccount(key);
const chain = arcChain('testnet');
const client = createPublicClient({chain, transport:http()});
const wallet = createWalletClient({account, chain, transport:http()});
if (await client.getChainId() !== 5042002) throw Error('Testnet only');
const d = JSON.parse(readFileSync(resolve(root,'deployments/arc-testnet.json'),'utf8'));
const pool = d.pools['USDC-1'].address;
const evidence = {date:new Date().toISOString(),chainId:chain.id,wallet:account.address,transactions:[],screens:[],errors:[]};
const save = () => writeFileSync(resolve(root,'.run/browser-wallet-transactions.json'), JSON.stringify(evidence,null,2)+'\n');
const abi = parseAbi(['function approve(address,uint256)', 'function registerKeys(uint256,bytes)', 'function sendToken(uint256,address,address,uint256,bytes,bytes1)', 'function deposit(bytes32)']);
const counts = {};
async function walletRequest({method,params=[]}) {
 if(method==='eth_accounts'||method==='eth_requestAccounts')return [account.address];
 if(method==='eth_chainId')return '0x4cef52';
 if(method==='wallet_switchEthereumChain'||method==='wallet_addEthereumChain'){
  if(params[0].chainId!=='0x4cef52')throw Error('Testnet only');return null;
 }
 if(method==='personal_sign'){
  const message=Buffer.from(params[0].slice(2),'hex').toString('utf8');
  if(message!==STEALTH_KEYS_MESSAGE)throw Error('Unexpected signature request');
  return wallet.signMessage({message});
 }
 if(method==='eth_sendTransaction'){
  const tx=params[0];
  if(tx.from.toLowerCase()!==account.address.toLowerCase()||BigInt(tx.value??0)!==0n)throw Error('Unexpected sender/value');
  const {functionName:name,args}=decodeFunctionData({abi,data:tx.data});
  const target=tx.to.toLowerCase();
  if(name==='approve'){
   if(target!==d.usdc.toLowerCase()||![pool,d.stealthPay].some(a=>a.toLowerCase()===args[0].toLowerCase())||args[1]>1000000n)throw Error('Approval outside budget');
  }else if(name==='deposit'){
   if(target!==pool.toLowerCase())throw Error('Wrong pool');
  }else if(name==='registerKeys'){
   if(target!==d.stealthRegistry.toLowerCase())throw Error('Wrong registry');
  }else if(name==='sendToken'){
   if(target!==d.stealthPay.toLowerCase()||args[2].toLowerCase()!==d.usdc.toLowerCase()||args[3]!==10000n)throw Error('Unexpected payment');
  }else throw Error('Unexpected call');
  counts[name]=(counts[name]??0)+1;
  if(counts[name]>(name==='approve'?2:1))throw Error('Duplicate broadcast refused');
  const gas=await client.estimateGas({account,to:tx.to,data:tx.data});
  const gasPrice=await client.getGasPrice();
  if(gas*gasPrice>50_000_000_000_000_000n)throw Error('Per-transaction gas exceeds 0.05 USDC test cap');
  const hash=await wallet.sendTransaction({to:tx.to,data:tx.data});
  const r=await client.waitForTransactionReceipt({hash});
  evidence.transactions.push({step:name,hash,status:r.status,gasUsdc:formatEther(r.gasUsed*r.effectiveGasPrice)});save();
  if(r.status!=='success')throw Error('Transaction reverted');
  return hash;
 }
 if(['eth_estimateGas','eth_getTransactionCount','eth_gasPrice','eth_maxPriorityFeePerGas','eth_getBlockByNumber','eth_getBalance','eth_call'].includes(method))return client.request({method,params});
 throw Error(`Unsupported wallet method ${method}`);
}

const token=randomBytes(32).toString('hex');
const origin='http://127.0.0.1:9212';
const bootstrap=`<script>Object.defineProperty(window,'kakushiTestWallet',{value:{request:async function(a){const r=await fetch('/__test_wallet',{method:'POST',headers:{'content-type':'application/json','x-test-capability':'${token}'},body:JSON.stringify(a)});const o=await r.json();if(o.error)throw Error(o.error);return o.result;}}});</script>`;
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try {
  if(req.url==='/__test_wallet'){
   if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-test-capability']!==token){res.writeHead(403);return res.end();}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)throw Error('Request too large');}
   res.setHeader('content-type','application/json');
   try{res.end(JSON.stringify({result:await walletRequest(JSON.parse(body))}));}catch(e){console.log('wallet error',e.shortMessage??e.message);res.end(JSON.stringify({error:e.shortMessage??e.message}));}
   return;
  }
  let body; if(!['GET','HEAD'].includes(req.method)){const chunks=[];for await(const chunk of req)chunks.push(chunk);body=Buffer.concat(chunks);}
  const headers={...req.headers};delete headers.host;delete headers['content-length'];delete headers['accept-encoding'];delete headers['if-none-match'];delete headers['if-modified-since'];
  const upstream=await fetch('http://127.0.0.1:9210'+req.url,{method:req.method,headers,body});
  res.statusCode=upstream.status;
  for(const [k,v] of upstream.headers)if(!['content-length','content-encoding','transfer-encoding','cache-control','etag'].includes(k))res.setHeader(k,v);
  if(upstream.headers.get('content-type')?.includes('text/html'))res.end((await upstream.text()).replace('<head>','<head>'+bootstrap));
  else if(upstream.headers.get('content-type')?.includes('javascript'))res.end((await upstream.text()).replaceAll('window.ethereum','window.kakushiTestWallet'));
  else res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch(e){res.statusCode=500;res.end(e.shortMessage??e.message);}
});
server.listen(9212,'127.0.0.1',()=>console.log('Testnet-only browser wallet proxy: http://127.0.0.1:9212'));
