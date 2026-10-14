// Live testnet only. Keys remain in Node; this injects an EIP-1193 wallet, not payment/proof responses.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createPublicClient,createWalletClient,http,decodeFunctionData,parseAbi,formatEther,erc20Abi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {arcChain,STEALTH_KEYS_MESSAGE} from '../packages/sdk/src/index.ts';
export async function runLive({context,page,base,cfg,report,out}) {
 const env=readFileSync('.run/round2.env','utf8');
 const key=n=>new RegExp('^'+n+'=(0x[0-9a-fA-F]{64})$','m').exec(env)?.[1];
 const account=privateKeyToAccount(key('PAYER_KEY'));const recipient=privateKeyToAccount(key('RECIPIENT_KEY'));
 const chain=arcChain('testnet');const client=createPublicClient({chain,transport:http()});const wallet=createWalletClient({chain,account,transport:http()});
 assert.equal(await client.getChainId(),5042002);assert.equal(cfg.chainId,5042002);
 assert(await client.getBalance({address:account.address})>1050000000000000000n,'Fund .run/round2.env PAYER_KEY with >1.05 testnet USDC; this harness never funds automatically.');
 const d=cfg.deployment,pool=d.pools['USDC-1'].address;
 const live=report.live={wallet:account.address,recipient:recipient.address,transactions:[],proofAssets:[],errors:[]};
 const save=()=>writeFileSync('.run/round2-live-results.json',JSON.stringify(live,null,2)+'\n');
 const abi=parseAbi(['function approve(address,uint256)','function registerKeys(uint256,bytes)','function sendToken(uint256,address,address,uint256,bytes,bytes1)','function deposit(bytes32)']);const counts={};
 await context.exposeBinding('round2Wallet',async(source,{method,params=[]})=>{
  assert.equal(new URL(source.frame.url()).origin,new URL(base).origin);
  if(['eth_accounts','eth_requestAccounts'].includes(method))return [account.address];
  if(method==='eth_chainId')return '0x4cef52';
  if(['wallet_switchEthereumChain','wallet_addEthereumChain'].includes(method)){assert.equal(params[0].chainId,'0x4cef52');return null;}
  if(method==='personal_sign'){const message=Buffer.from(params[0].slice(2),'hex').toString();assert.equal(message,STEALTH_KEYS_MESSAGE);return wallet.signMessage({message});}
  if(method==='eth_sendTransaction'){
   const tx=params[0];assert.equal(tx.from.toLowerCase(),account.address.toLowerCase());assert.equal(BigInt(tx.value??0),0n);
   const {functionName:name,args}=decodeFunctionData({abi,data:tx.data});const target=tx.to.toLowerCase();
   if(name==='approve'){assert.equal(target,d.usdc.toLowerCase());assert([pool,d.stealthPay].some(a=>a.toLowerCase()===args[0].toLowerCase()));assert(args[1]<=1000000n);}
   else if(name==='registerKeys')assert.equal(target,d.stealthRegistry.toLowerCase());
   else if(name==='deposit')assert.equal(target,pool.toLowerCase());
   else if(name==='sendToken'){assert.equal(target,d.stealthPay.toLowerCase());assert.equal(args[2].toLowerCase(),d.usdc.toLowerCase());assert.equal(args[3],10000n);}
   else throw Error('Unexpected call');
   counts[name]=(counts[name]??0)+1;assert(counts[name]<=(name==='approve'?3:name==='sendToken'?2:1),'Duplicate call refused');
   const gas=await client.estimateGas({account,to:tx.to,data:tx.data});assert(gas*await client.getGasPrice()<50000000000000000n);
   const hash=await wallet.sendTransaction({to:tx.to,data:tx.data});const receipt=await client.waitForTransactionReceipt({hash});assert.equal(receipt.status,'success');
   live.transactions.push({step:name,hash,gasUsdc:formatEther(receipt.gasUsed*receipt.effectiveGasPrice)});save();console.log('Confirmed',name,hash);return hash;
  }
  if(['eth_estimateGas','eth_getTransactionCount','eth_gasPrice','eth_maxPriorityFeePerGas','eth_getBlockByNumber','eth_getBalance','eth_call'].includes(method))return client.request({method,params});
  throw Error('Unsupported wallet method '+method);
 });
 await context.addInitScript(()=>{window.ethereum={request:a=>window.round2Wallet(a)};});
 page.on('response',r=>{if(/worker|\.wasm/.test(r.url()))live.proofAssets.push({url:r.url(),status:r.status()});});
 page.on('requestfailed',r=>live.errors.push({url:r.url(),error:r.failure()?.errorText}));
 await page.setViewportSize({width:390,height:1000});
 await page.goto(base+'/#try',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Connect',exact:true}).filter({visible:true}).last().click();
 await page.getByRole('link',{name:'enable private receiving'}).click();
 await page.getByRole('button',{name:'Unlock with your wallet',exact:true}).click();
 await page.getByRole('button',{name:/List my address/}).click();
 await page.getByText('Listed on Arc Testnet: anyone can pay your address',{exact:true}).waitFor({timeout:60000});
 await page.getByRole('link',{name:'Kakushi, home'}).filter({visible:true}).first().click();
 await page.getByRole('button',{name:'Pay 0.01 USDC privately',exact:true}).click();
 await page.getByRole('button',{name:'Paid privately',exact:true}).waitFor({timeout:60000});
 await page.screenshot({path:out+'/round2-widget-paid-390.jpg',fullPage:true});
 await page.getByRole('link',{name:'enable private receiving'}).click();
 await page.getByRole('button',{name:'Move',exact:true}).first().waitFor({timeout:60000});
 await page.screenshot({path:out+'/round2-receive-found-390.jpg',fullPage:true});
 await page.getByRole('button',{name:'Move',exact:true}).first().click();
 await page.getByRole('textbox',{name:'Destination address'}).fill(account.address);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await page.getByText('Moved to your wallet',{exact:true}).waitFor({timeout:60000});
 await page.getByText('Details',{exact:true}).click();
 const moveHash=(await page.locator('a[href*="/tx/"]').last().getAttribute('href')).split('/').pop();
 live.transactions.push({step:'move',hash:moveHash});save();
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Pay',exact:true}).click();
 await page.getByRole('textbox',{name:'Recipient meta-address or wallet'}).fill(account.address);
 await page.getByRole('textbox',{name:'Amount of USDC'}).fill('0.01');await page.getByRole('button',{name:'Send privately',exact:true}).click();
 await page.getByText('Sent 0.01 USDC',{exact:true}).waitFor({timeout:60000});
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Shield',exact:true}).click();
 await page.getByRole('button',{name:'Shield 1 USDC',exact:true}).click();
 // A denied clipboard write must never enable Deposit.
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('clipboard denied for regression check');};});
 await page.getByRole('button',{name:'Copy note',exact:true}).click();assert(await page.getByRole('button',{name:'Save your note first',exact:true}).isDisabled());
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download note',exact:true}).click();const download=await downloadPromise;await download.saveAs('.run/round2-note.txt');
 await page.getByRole('button',{name:'Deposit',exact:true}).last().click();
 await page.getByText('Shielded 1 USDC',{exact:true}).waitFor({timeout:60000});
 await page.screenshot({path:out+'/round2-deposit-390.jpg',fullPage:true});
 await page.getByRole('button',{name:'Withdraw',exact:true}).click();
 await page.getByRole('textbox',{name:'Your note'}).fill(readFileSync('.run/round2-note.txt','utf8'));
 await page.getByRole('textbox',{name:'Recipient',exact:true}).fill(recipient.address);
 await page.getByRole('checkbox').waitFor({timeout:30000});assert(await page.getByRole('checkbox').isChecked());
 live.recipientBalanceBefore=formatEther(await client.getBalance({address:recipient.address}));assert.equal(live.recipientBalanceBefore,'0');
 live.isolated=await page.evaluate(()=>crossOriginIsolated);assert(live.isolated,'Hosted proving requires isolation');
 const start=Date.now();await page.getByRole('button',{name:'Withdraw',exact:true}).last().click();
 await page.getByText('Withdrawn, gasless',{exact:true}).waitFor({timeout:240000});live.withdrawMs=Date.now()-start;
 await page.getByText('Details',{exact:true}).click();const hash=(await page.locator('a[href*="/tx/"]').last().getAttribute('href')).split('/').pop();
 const receipt=await client.waitForTransactionReceipt({hash});assert.equal(receipt.status,'success');
 live.transactions.push({step:'hosted-browser-proof-relay',hash,gasUsdc:formatEther(receipt.gasUsed*receipt.effectiveGasPrice)});
 live.recipientBalanceAfter=formatEther(await client.getBalance({address:recipient.address}));live.recipientNonce=await client.getTransactionCount({address:recipient.address});assert.equal(live.recipientNonce,0);assert(Number(live.recipientBalanceAfter)>0.8);
 await page.getByRole('textbox',{name:'Your note'}).fill('');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+`/round2-withdraw-${width}.jpg`,fullPage:true});}
 save();console.log('PASS hosted proof, relay, recipient balance',live.recipientBalanceAfter);
}
