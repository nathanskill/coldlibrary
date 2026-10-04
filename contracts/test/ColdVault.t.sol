// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ColdVault, ColdVaultFactory} from "../src/ColdVault.sol";

contract MockToken {
    mapping(address => uint256) public balanceOf;
    bool public returnsNothing;
    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function setReturnsNothing(bool v) external { returnsNothing = v; }
    function transfer(address to, uint256 a) external returns (bool) {
        balanceOf[msg.sender] -= a;
        balanceOf[to] += a;
        if (returnsNothing) assembly { return(0, 0) }
        return true;
    }
}

contract ReentrantHeir {
    ColdVault public vault;
    uint256 public hits;
    function set(ColdVault v) external { vault = v; }
    function go() external { vault.claim(address(0)); }
    receive() external payable { if (hits++ == 0) vault.claim(address(0)); }
}

contract ColdVaultTest is Test {
    ColdVaultFactory factory;
    ColdVault vault;
    address owner = makeAddr("owner");
    address heirA = makeAddr("heirA");
    address heirB = makeAddr("heirB");
    address k1 = makeAddr("k1");
    address k2 = makeAddr("k2");
    address k3 = makeAddr("k3");
    address stranger = makeAddr("stranger");
    uint64 constant HB = 180 days;
    uint64 constant VETO = 28 days;

    function heirs2() internal view returns (ColdVault.Heir[] memory h) {
        h = new ColdVault.Heir[](2);
        h[0] = ColdVault.Heir(heirA, 7000);
        h[1] = ColdVault.Heir(heirB, 3000);
    }

    function keepers3() internal view returns (address[] memory k) {
        k = new address[](3);
        k[0] = k1; k[1] = k2; k[2] = k3;
    }

    function setUp() public {
        vm.warp(1_800_000_000);
        factory = new ColdVaultFactory();
        vm.prank(owner);
        vault = ColdVault(payable(factory.create("coldlibrary:M-000001", heirs2(), keepers3(), 2, HB, VETO, 0)));
        vm.deal(owner, 100 ether);
        vm.prank(owner);
        (bool ok,) = address(vault).call{value: 10 ether}("");
        assertTrue(ok);
    }

    function _trigger() internal {
        vm.warp(block.timestamp + HB);
        vm.prank(k1); vault.confirmSilence();
        vm.prank(k2); vault.confirmSilence();
    }

    // ---------------------------------------------------------------- basics
    function test_factoryIndexesOwner() public view {
        assertEq(factory.vaultsOf(owner).length, 1);
        assertEq(vault.owner(), owner);
        assertEq(vault.itemRef(), "coldlibrary:M-000001");
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
    }

    function test_ownerCanWithdrawAnytime() public {
        vm.prank(owner); vault.withdraw(address(0), owner, 4 ether);
        assertEq(address(vault).balance, 6 ether);
        assertEq(owner.balance, 94 ether);
    }

    function test_onlyOwnerCanWithdrawOrConfigure() public {
        vm.prank(stranger); vm.expectRevert(ColdVault.NotOwner.selector); vault.withdraw(address(0), stranger, 1);
        vm.prank(k1); vm.expectRevert(ColdVault.NotOwner.selector); vault.checkIn();
        vm.prank(heirA); vm.expectRevert(ColdVault.NotOwner.selector); vault.configure(heirs2(), keepers3(), 2, HB, VETO, 0);
    }

    // ---------------------------------------------------------------- configuration rules
    function test_sharesMustSumTo100Percent() public {
        ColdVault.Heir[] memory h = heirs2();
        h[1].bps = 2999;
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(h, keepers3(), 2, HB, VETO, 0);
    }

    function test_rejectsDuplicateHeirOrKeeper() public {
        ColdVault.Heir[] memory h = heirs2();
        h[1].account = heirA;
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(h, keepers3(), 2, HB, VETO, 0);
        address[] memory k = keepers3();
        k[2] = k1;
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), k, 2, HB, VETO, 0);
    }

    function test_rejectsOwnerAsKeeperAndBadThreshold() public {
        address[] memory k = keepers3();
        k[0] = owner;
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), k, 2, HB, VETO, 0);
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), keepers3(), 4, HB, VETO, 0);
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), keepers3(), 0, HB, VETO, 0);
    }

    function test_rejectsBadPeriodsAndPastDate() public {
        vm.startPrank(owner);
        vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), keepers3(), 2, 1 days, VETO, 0);
        vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), keepers3(), 2, HB, 1 hours, 0);
        vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), keepers3(), 2, HB, VETO, uint64(block.timestamp));
        vm.stopPrank();
    }

    function test_noKeepersNeedsADate() public {
        address[] memory none = new address[](0);
        vm.prank(owner); vm.expectRevert(ColdVault.BadConfig.selector); vault.configure(heirs2(), none, 0, HB, VETO, 0);
        vm.prank(owner); vault.configure(heirs2(), none, 0, HB, VETO, uint64(block.timestamp + 365 days));
    }

    function test_reconfigureReplacesHeirs() public {
        ColdVault.Heir[] memory h = new ColdVault.Heir[](1);
        h[0] = ColdVault.Heir(stranger, 10000);
        vm.prank(owner); vault.configure(h, keepers3(), 2, HB, VETO, 0);
        assertEq(vault.shareOf(heirA), 0);
        assertEq(vault.shareOf(stranger), 10000);
    }

    // ---------------------------------------------------------------- silence and keepers
    function test_keepersCannotConfirmBeforeHeartbeat() public {
        vm.warp(block.timestamp + HB - 1);
        vm.prank(k1); vm.expectRevert(ColdVault.TooEarly.selector); vault.confirmSilence();
    }

    function test_strangerCannotConfirm() public {
        vm.warp(block.timestamp + HB);
        vm.prank(stranger); vm.expectRevert(ColdVault.NotKeeper.selector); vault.confirmSilence();
    }

    function test_keeperCannotConfirmTwice() public {
        vm.warp(block.timestamp + HB);
        vm.prank(k1); vault.confirmSilence();
        vm.prank(k1); vm.expectRevert(ColdVault.AlreadyConfirmed.selector); vault.confirmSilence();
    }

    function test_quorumStartsVetoWindow() public {
        _trigger();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Confirming));
        vm.expectRevert(ColdVault.TooEarly.selector); vault.release();
    }

    function test_ownerCheckInCancelsEverything() public {
        _trigger();
        vm.prank(owner); vault.checkIn();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
        assertEq(vault.confirmations(), 0);
        vm.warp(block.timestamp + VETO);
        vm.expectRevert(ColdVault.TooEarly.selector); vault.release();
        // old confirmations do not count in the new round
        vm.warp(block.timestamp + HB);
        vm.prank(k1); vault.confirmSilence();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
    }

    function test_ownerWithdrawCountsAsCheckIn() public {
        _trigger();
        vm.prank(owner); vault.withdraw(address(0), owner, 1 ether);
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
    }

    function test_anyKeeperCanVeto() public {
        _trigger();
        vm.prank(k3); vault.veto();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
        vm.warp(block.timestamp + VETO);
        vm.expectRevert(ColdVault.TooEarly.selector); vault.release();
    }

    function test_aKeeperCannotBlockForever() public {
        _trigger();
        vm.prank(k3); vault.veto();
        vm.prank(k1); vault.confirmSilence();
        vm.prank(k2); vault.confirmSilence();
        vm.prank(k3); vm.expectRevert(ColdVault.VetoUsed.selector); vault.veto();
        vm.warp(block.timestamp + VETO);
        vault.release();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Released));
    }

    function test_ownerCheckInRestoresVetoes() public {
        _trigger();
        vm.prank(k3); vault.veto();
        vm.prank(owner); vault.checkIn();
        _trigger();
        vm.prank(k3); vault.veto();
        assertEq(uint8(vault.state()), uint8(ColdVault.State.Active));
    }

    // ---------------------------------------------------------------- release and claims
    function test_fullPathSplitsNativeCoin() public {
        _trigger();
        vm.warp(block.timestamp + VETO);
        vm.prank(stranger); vault.release();
        assertEq(vault.claimable(address(0), heirA), 7 ether);
        assertEq(vault.claimable(address(0), heirB), 3 ether);
        vm.prank(heirA); vault.claim(address(0));
        vm.prank(heirB); vault.claim(address(0));
        assertEq(heirA.balance, 7 ether);
        assertEq(heirB.balance, 3 ether);
        assertEq(address(vault).balance, 0);
    }

    function test_noClaimsBeforeRelease() public {
        vm.prank(heirA); vm.expectRevert(ColdVault.NothingToClaim.selector); vault.claim(address(0));
        _trigger();
        vm.prank(heirA); vm.expectRevert(ColdVault.NothingToClaim.selector); vault.claim(address(0));
    }

    function test_nonHeirCannotClaim() public {
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        vm.prank(stranger); vm.expectRevert(ColdVault.NotHeir.selector); vault.claim(address(0));
    }

    function test_ownerLosesControlAfterRelease() public {
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        vm.startPrank(owner);
        vm.expectRevert(ColdVault.BadState.selector); vault.withdraw(address(0), owner, 1);
        vm.expectRevert(ColdVault.BadState.selector); vault.checkIn();
        vm.expectRevert(ColdVault.BadState.selector); vault.configure(heirs2(), keepers3(), 2, HB, VETO, 0);
        vm.stopPrank();
    }

    function test_lateDepositsAreSplitToo() public {
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        vm.prank(heirA); vault.claim(address(0)); // 7
        vm.deal(stranger, 5 ether);
        vm.prank(stranger); (bool ok,) = address(vault).call{value: 5 ether}(""); assertTrue(ok);
        assertEq(vault.claimable(address(0), heirA), 3.5 ether);
        assertEq(vault.claimable(address(0), heirB), 4.5 ether);
        vm.prank(heirA); vault.claim(address(0));
        vm.prank(heirB); vault.claim(address(0));
        assertEq(heirA.balance, 10.5 ether);
        assertEq(heirB.balance, 4.5 ether);
    }

    function test_erc20Split_includingTokensThatReturnNothing() public {
        MockToken t = new MockToken();
        t.mint(address(vault), 1000);
        t.setReturnsNothing(true);
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        vm.prank(heirA); vault.claim(address(t));
        vm.prank(heirB); vault.claim(address(t));
        assertEq(t.balanceOf(heirA), 700);
        assertEq(t.balanceOf(heirB), 300);
    }

    function test_releaseByDateWithoutKeepers() public {
        address[] memory none = new address[](0);
        uint64 date = uint64(block.timestamp + 365 days);
        vm.prank(owner); vault.configure(heirs2(), none, 0, HB, VETO, date);
        vm.warp(date - 1);
        vm.expectRevert(ColdVault.TooEarly.selector); vault.release();
        vm.warp(date);
        vault.release();
        vm.prank(heirB); vault.claim(address(0));
        assertEq(heirB.balance, 3 ether);
    }

    function test_reentrancyBlocked() public {
        ReentrantHeir evil = new ReentrantHeir();
        ColdVault.Heir[] memory h = new ColdVault.Heir[](2);
        h[0] = ColdVault.Heir(address(evil), 5000);
        h[1] = ColdVault.Heir(heirB, 5000);
        vm.prank(owner); vault.configure(h, keepers3(), 2, HB, VETO, 0);
        evil.set(vault);
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        vm.expectRevert(ColdVault.TransferFailed.selector);
        evil.go();
        assertEq(address(vault).balance, 10 ether);
    }

    // ---------------------------------------------------------------- fuzz: nothing is ever over-paid
    function testFuzz_claimsNeverExceedBalance(uint16 a, uint96 first, uint96 later) public {
        a = uint16(bound(a, 1, 9999));
        ColdVault.Heir[] memory h = new ColdVault.Heir[](2);
        h[0] = ColdVault.Heir(heirA, a);
        h[1] = ColdVault.Heir(heirB, 10000 - a);
        vm.prank(owner); vault.configure(h, keepers3(), 2, HB, VETO, 0);
        vm.prank(owner); vault.withdraw(address(0), owner, 10 ether);
        vm.deal(address(vault), first);
        _trigger(); vm.warp(block.timestamp + VETO); vault.release();
        if (vault.claimable(address(0), heirA) > 0) { vm.prank(heirA); vault.claim(address(0)); }
        vm.deal(address(vault), address(vault).balance + later);
        if (vault.claimable(address(0), heirB) > 0) { vm.prank(heirB); vault.claim(address(0)); }
        if (vault.claimable(address(0), heirA) > 0) { vm.prank(heirA); vault.claim(address(0)); }
        uint256 total = uint256(first) + later;
        assertLe(heirA.balance + heirB.balance, total);
        assertLe(total - (heirA.balance + heirB.balance), 2); // rounding dust only
    }
}
