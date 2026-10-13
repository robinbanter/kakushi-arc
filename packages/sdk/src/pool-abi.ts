// KakushiPool (Arc): the interface the SDK, the app and the relayer share.
//
//   function deposit(bytes32 commitment)
//     Pulls exactly `denomination` USDC from the caller (prior approval to the pool) behind the commitment.
//   function withdraw(bytes proof, bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee)
//     Verifies the Noir withdraw proof against public inputs (root, nullifierHash, recipient, relayer, fee,
//     refund = 0, chainId, pool, extDataHash = 0), requires `root` to be a known (recent) root and
//     `nullifierHash` unspent, marks it spent, pays `fee` USDC to `relayer` and the rest to `recipient`.
//   event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)
//     Emitted once per inserted leaf; leafIndex is 0,1,2,... in insertion order.
//   event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee)
//
// Field elements (root, nullifierHash, commitment) are BN254 scalars encoded as big-endian uint256 in the bytes32.
import { parseAbi } from "viem";

export const kakushiPoolAbi = parseAbi([
  "function deposit(bytes32 commitment)",
  "function withdraw(bytes proof, bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee)",
  "function publicInputs(bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee) view returns (bytes32[])",
  "function token() view returns (address)",
  "function denomination() view returns (uint256)",
  "function maxDeposits() view returns (uint32)",
  "function nextIndex() view returns (uint32)",
  "function isSpent(bytes32 nullifierHash) view returns (bool)",
  "function isKnownRoot(bytes32 root) view returns (bool)",
  "function getLastRoot() view returns (bytes32)",
  "event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
  "event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee)",
]);

/** StealthPay: pays a stealth address in an ERC-20 (USDC) and announces it on the ERC-5564 announcer, in one transaction. */
export const stealthPayAbi = parseAbi([
  "function sendToken(uint256 schemeId, address stealthAddress, address token, uint256 amount, bytes ephemeralPubKey, bytes1 viewTag)",
]);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);
