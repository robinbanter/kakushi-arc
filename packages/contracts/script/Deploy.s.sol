// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {StealthRegistry} from "../src/privacy/StealthRegistry.sol";
import {StealthAnnouncer} from "../src/privacy/StealthAnnouncer.sol";
import {StealthPay} from "../src/privacy/StealthPay.sol";
import {KakushiPool} from "../src/privacy/KakushiPool.sol";
import {IVerifier} from "../src/interfaces/IVerifier.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";
import {ShieldedWithdrawVerifier} from "../src/verifiers/ShieldedWithdrawVerifier.sol";

/// @notice Deploys Kakushi on Arc: ERC-6538 registry, ERC-5564 announcer, StealthPay, the UltraHonk verifier
///         and three fixed-denomination USDC pools (1, 10, 100 USDC), then writes
///         deployments/arc-<testnet|mainnet>.json at the repo root. Plain CREATE from the deployer (no CreateX
///         dependency). The chain is read from block.chainid: 5042002 = testnet, 5042 = mainnet; anything else
///         (e.g. an anvil fork reporting another id) must set KAKUSHI_NETWORK=testnet|mainnet explicitly.
///
///         Use scripts/deploy.sh: it holds the shared deployer lock, requires CONFIRM_MAINNET=yes for
///         mainnet and reads the key from a file, never from argv.
///
///           env: DEPLOYER_PRIVATE_KEY (required), KAKUSHI_NETWORK (optional override), KAKUSHI_OUT (optional json path)
contract Deploy is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    uint256 constant ARC_MAINNET = 5042;
    uint256 constant ARC_TESTNET = 5042002;

    struct PoolSpec {
        string label;
        uint256 denomination; // USDC base units (6 decimals)
        uint32 maxDeposits; // beta guard rail: the pool never accepts more notes than this
    }

    function pools() public pure returns (PoolSpec[] memory s) {
        s = new PoolSpec[](3);
        s[0] = PoolSpec("USDC-1", 1e6, 5000); // <= 5,000 USDC at rest
        s[1] = PoolSpec("USDC-10", 10e6, 2000); // <= 20,000 USDC
        s[2] = PoolSpec("USDC-100", 100e6, 1000); // <= 100,000 USDC
    }

    function run() external {
        string memory net = vm.envOr("KAKUSHI_NETWORK", string(""));
        if (bytes(net).length == 0) net = block.chainid == ARC_MAINNET ? "mainnet" : "testnet";
        require(keccak256(bytes(net)) == keccak256("mainnet") || keccak256(bytes(net)) == keccak256("testnet"), "network");
        if (keccak256(bytes(net)) == keccak256("mainnet")) require(block.chainid == ARC_MAINNET, "mainnet needs chain 5042");
        if (block.chainid == ARC_TESTNET) require(keccak256(bytes(net)) == keccak256("testnet"), "chain 5042002 is testnet");
        require(USDC.code.length > 0, "USDC (0x3600..) has no code: wrong chain?");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        console2.log("network", net);
        console2.log("deployer", deployer);

        vm.startBroadcast(pk);
        StealthRegistry registry = new StealthRegistry();
        StealthAnnouncer announcer = new StealthAnnouncer();
        StealthPay pay = new StealthPay(IERC5564Announcer(address(announcer)));
        ShieldedWithdrawVerifier verifier = new ShieldedWithdrawVerifier();
        PoolSpec[] memory specs = pools();
        address[] memory deployed = new address[](specs.length);
        for (uint256 i; i < specs.length; i++) {
            deployed[i] = address(new KakushiPool(IVerifier(address(verifier)), USDC, specs[i].denomination, specs[i].maxDeposits));
        }
        vm.stopBroadcast();

        string memory path = vm.envOr("KAKUSHI_OUT", string.concat("../../deployments/arc-", net, ".json"));
        _write(path, net, deployer, registry, announcer, pay, verifier, specs, deployed);
    }

    function _write(
        string memory path,
        string memory net,
        address deployer,
        StealthRegistry registry,
        StealthAnnouncer announcer,
        StealthPay pay,
        ShieldedWithdrawVerifier verifier,
        PoolSpec[] memory specs,
        address[] memory deployed
    ) internal {
        string memory poolsJson = "{}";
        for (uint256 i; i < specs.length; i++) {
            string memory e = string.concat("pool.", specs[i].label);
            vm.serializeAddress(e, "address", deployed[i]);
            vm.serializeString(e, "denomination", vm.toString(specs[i].denomination));
            vm.serializeUint(e, "maxDeposits", specs[i].maxDeposits);
            string memory entry = vm.serializeUint(e, "decimals", 6);
            poolsJson = vm.serializeString("pools", specs[i].label, entry);
        }
        string memory o = "deployment";
        vm.serializeString(o, "network", net);
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeAddress(o, "deployer", deployer);
        vm.serializeUint(o, "deployBlock", block.number);
        vm.serializeAddress(o, "usdc", USDC);
        vm.serializeAddress(o, "stealthRegistry", address(registry));
        vm.serializeAddress(o, "stealthAnnouncer", address(announcer));
        vm.serializeAddress(o, "stealthPay", address(pay));
        vm.serializeAddress(o, "shieldedVerifier", address(verifier));
        string memory json = vm.serializeString(o, "pools", poolsJson);
        vm.writeJson(json, path);
        console2.log("wrote", path);
    }
}
