import * as c from './dryrun-common.mjs';
await c.run('kakushi', async () => {
const {IncrementalMerkleTree,noteCommitment,buildRegisterKeysCalldata,deriveStealthKeys,fieldToHex,generateNote,planStealthSend,scanAnnouncements,withdrawWitness}=await import('../packages/sdk/src/index.ts');
const {proveWithdraw}=await import('../packages/sdk/src/node.ts');
const n='kakushi',d=c.load(n),pool=d.pools['USDC-1'].address,a=c.abi(n,'KakushiPool');
await c.fund(n,'buyer','1.3');await c.fund(n,'provider','0.05');await c.fund(n,'relayer','0.3');
const bobKeys=await deriveStealthKeys(c.accounts.provider);
await c.tx(n,'register stealth meta-address','provider',d.stealthRegistry,buildRegisterKeysCalldata(bobKeys.metaAddress));
const plan=planStealthSend({metaAddress:bobKeys.metaAddress,amount:100000n,usdc:c.USDC,stealthPay:d.stealthPay});
await c.tx(n,'approve stealth payment','buyer',plan.approve.to,plan.approve.data);
await c.tx(n,'send stealth 0.1 USDC','buyer',plan.pay.to,plan.pay.data);
const matches=await scanAnnouncements(c.pub,d.stealthAnnouncer,BigInt(d.deployBlock),await c.pub.getBlockNumber(),bobKeys,{withBalances:true,concurrency:1});
if(matches.length!==1||matches[0].balance!==100000n)throw Error('Stealth scan mismatch');
const note=generateNote(5042,pool);
await c.approve(n,'buyer',pool,1000000n);
await c.write(n,'shield 1 USDC','buyer',pool,a,'deposit',[fieldToHex(BigInt(noteCommitment(note)))], 'success',1500000n);
const tree=await IncrementalMerkleTree.fromDeposits(c.pub,pool,BigInt(d.deployBlock),undefined,{concurrency:1});
// A fresh zero-balance recipient, with its key retained only in memory.
const recipient=c.accounts.auditor.address;if(await c.bal(recipient)!==0n)throw Error('Recipient not empty');
const fee=134375n,w=withdrawWitness(note,tree,{recipient,relayer:c.roles.relayer,fee});
const proof=await proveWithdraw(w,1);c.note('realNoirProof',{ms:proof.ms,proofBytes:(proof.proof.length-2)/2});
await c.write(n,'relayer withdraw real UltraHonk proof','relayer',pool,a,'withdraw',[proof.proof,w.root,w.nullifierHash,recipient,c.roles.relayer,fee]);
if(await c.bal(recipient)!==1000000n-fee)throw Error('Withdrawal amount mismatch');
if(await c.pub.getTransactionCount({address:recipient})!==0)throw Error('Recipient sent a transaction');

});
