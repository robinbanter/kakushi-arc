/** Read-only default; LIVE=1 runs the bounded real testnet flow (see docs/E2E-TESTNET.md). */
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.resolve('../thenar-arc/package.json'))('playwright'));}
const base=process.env.BASE||'https://kakushi-arc.vercel.app';
const out=process.env.SCREEN_DIR||'docs/screens/testnet';mkdirSync(out,{recursive:true});
const temp=path.resolve('.run/round2-browser');mkdirSync(temp,{recursive:true});process.env.TMPDIR=temp;
const report={base,at:new Date().toISOString(),routes:[],navigation:[],errors:[]};
const cfg=await (await fetch(base+'/api/config')).json();assert.equal(cfg.chainId,5042002);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const context=await browser.newContext();await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/','/send','/receive','/shield','/developers']){
   const r=await page.goto(base+route,{waitUntil:'networkidle'});await page.waitForTimeout(500);
   const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),isolated:crossOriginIsolated,text:document.body.innerText}));
   assert.equal(r.status(),200);assert(data.isolated,route+' lacks cross-origin isolation');assert(!data.overflow,route+' overflows');assert(!data.brokenImages.length);
   assert(!/\b(?:Monad|AUSD|NaN|undefined|lorem ipsum)\b/i.test(data.text));
   delete data.text;report.routes.push({route,width,status:r.status(),...data});
   await page.screenshot({path:`${out}/round2-${route==='/'?'home':route.slice(1)}-${width}.jpg`,fullPage:true});
  }
  await page.goto(base,{waitUntil:'networkidle'});
  for(const [name,route] of [['Pay','/send'],['Receive','/receive'],['Shield','/shield'],['Developers','/developers']]){
   if(width===390)await page.getByRole('button',{name:'Menu',exact:true}).click();
   await (width===390?page.getByRole('dialog'):page.locator('header').first()).getByRole('link',{name,exact:true}).click();
   await page.waitForURL(base+route);report.navigation.push({width,name,ok:true});
  }
  await page.getByRole('link',{name:'Kakushi, home'}).filter({visible:true}).first().click();await page.waitForURL(base+'/');
  await page.getByRole('link',{name:'Try a private payment',exact:true}).click();assert.equal(new URL(page.url()).hash,'#try');
 }
 await page.goto(base+'/developers',{waitUntil:'networkidle'});
 const examples=page.locator('section[aria-labelledby="code-title"]');
 report.developerTabs=await examples.getByRole('tab').allTextContents();
 for(const tab of await examples.getByRole('tab').all()){
  const name=await tab.innerText();await tab.click();
  await examples.getByRole('button',{name:'Copy '+name+' snippet',exact:true}).click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.equal(copied.trim(),readFileSync('packages/app/src/examples/'+name,'utf8').trim(),'Rendered snippet differs from compiled source');
 }
 await page.goto(base+'/shield',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Withdraw',exact:true}).click();await page.getByRole('textbox',{name:'Your note'}).fill('invalid-note');await page.getByText('Not a Kakushi note',{exact:true}).waitFor();
 await page.goto(base+'/send',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Connect',exact:true}).filter({visible:true}).first().click();await page.getByRole('alert').getByText(/No browser wallet/).waitFor();
 if(process.env.LIVE!=='1'){
 // Read-only wallet controls: public test address only, no signing or broadcast methods.
 await context.addInitScript(({account})=>{
  const listeners=new Map();
  window.ethereum={request:async({method})=>{if(method==='eth_requestAccounts')return [account];throw Error('Read-only account fixture');},on:(event,fn)=>listeners.set(event,fn),removeListener:(event)=>listeners.delete(event)};
  window.round2AccountsChanged=accounts=>listeners.get('accountsChanged')?.(accounts);
 },{account:cfg.deployment.deployer});
 await page.goto(base+'/receive',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Connect',exact:true}).filter({visible:true}).first().click();
 await page.getByRole('button',{name:'Unlock with your wallet',exact:true}).waitFor();
 await page.evaluate(()=>window.round2AccountsChanged([]));
 await page.getByRole('button',{name:'Connect wallet',exact:true}).waitFor();
 await page.getByRole('button',{name:'Connect',exact:true}).filter({visible:true}).first().click();
 await page.getByRole('button',{name:'Wallet',exact:true}).filter({visible:true}).first().click();
 await page.getByRole('menuitem',{name:'Disconnect',exact:true}).click();
 await page.getByRole('button',{name:'Connect wallet',exact:true}).waitFor();
 report.walletControls={mode:'read-only public account fixture; no signing',accountsChanged:true,disconnect:true};
 }
 const missing=await page.goto(base+'/route-does-not-exist',{waitUntil:'domcontentloaded'});assert.equal(missing.status(),404);
 report.errors=report.errors.filter(e=>!e.includes('404'));
 if(process.env.LIVE==='1'){const {runLive}=await import('./round2-live.mjs');await runLive({context,page,base,cfg,report,out});}
 assert.deepEqual(report.errors,[]);console.log('PASS',report.routes.length,'route/viewport checks;',report.navigation.length,'header links');
}finally{await browser.close();writeFileSync(`${out}/${process.env.LIVE==='1'?'round2-live-browser-results':'round2-results'}.json`,JSON.stringify(report,null,2)+'\n');}
