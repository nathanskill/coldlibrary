// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {ColdVaultFactory} from "../src/ColdVault.sol";

/// forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast --account <keystore>
/// Deploys the factory only. It has no owner, no admin and no fee; anyone may use it.
contract Deploy is Script {
    function run() external returns (ColdVaultFactory factory) {
        vm.startBroadcast();
        factory = new ColdVaultFactory();
        vm.stopBroadcast();
        console.log("ColdVaultFactory", address(factory));
    }
}
