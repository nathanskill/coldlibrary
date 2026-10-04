// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

/// @title Cold Vault
/// @notice A non-custodial continuance vault of the Cold Library protocol.
///
/// The owner keeps full control while they are around: they deposit, withdraw and change the plan
/// at any time, and every owner action counts as a check-in. The owner alone decides who receives
/// what share. If the owner stays silent for longer than `heartbeat`, `threshold` of the owner's
/// keepers may confirm the silence; a veto window follows, during which the owner (by checking in)
/// or any keeper (by vetoing) can stop it. After the window anyone may call `release`, and each heir
/// can then pull their share of every asset the vault holds, including assets that arrive later.
/// Optionally the owner can also set `releaseAfter`, a date after which the vault releases without
/// keepers, like a time capsule.
///
/// There is no admin, no fee, no upgrade path and no protocol key. Nobody but the rules can move funds.
contract ColdVault {
    // ------------------------------------------------------------------ types
    enum State {
        Active, // owner in control
        Confirming, // keepers reached quorum; veto window running
        Released // heirs may claim
    }

    struct Heir {
        address account;
        uint16 bps; // share in basis points; all heirs sum to 10_000
    }

    // ------------------------------------------------------------------ constants
    uint16 internal constant TOTAL_BPS = 10_000;
    uint256 public constant MAX_HEIRS = 20;
    uint256 public constant MAX_KEEPERS = 10;
    uint64 public constant MIN_HEARTBEAT = 7 days;
    uint64 public constant MAX_HEARTBEAT = 3650 days;
    uint64 public constant MIN_VETO = 1 days;
    uint64 public constant MAX_VETO = 365 days;
    address public constant NATIVE = address(0);

    // ------------------------------------------------------------------ storage
    address public immutable owner;
    string public itemRef; // link to an exhibit or plaque, e.g. "coldlibrary:M-000001"

    State public state;
    uint64 public heartbeat;
    uint64 public vetoWindow;
    uint64 public lastCheckIn;
    uint64 public triggeredAt;
    uint64 public releaseAfter; // 0 = no date release
    uint8 public threshold;
    uint32 public round; // bumps on every reset; old confirmations stop counting
    uint8 public confirmations;

    address[] internal _keepers;
    mapping(address => bool) public isKeeper;
    Heir[] internal _heirs;
    mapping(address => uint16) public shareOf;
    mapping(uint32 => mapping(address => bool)) public confirmed;
    uint32 public epoch; // bumps on every owner check-in
    mapping(uint32 => mapping(address => bool)) public vetoUsed; // one veto per keeper per epoch

    mapping(address => uint256) public totalClaimed; // token => claimed by all heirs
    mapping(address => mapping(address => uint256)) public claimed; // token => heir => claimed

    uint256 private _lock = 1;

    // ------------------------------------------------------------------ events
    event Configured(uint8 threshold, uint64 heartbeat, uint64 vetoWindow, uint64 releaseAfter, uint256 heirs, uint256 keepers);
    event PlanSet(Heir[] heirs, address[] keepers);
    event CheckedIn(uint64 at);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event SilenceConfirmed(address indexed keeper, uint32 round, uint8 confirmations);
    event Confirming(uint64 triggeredAt, uint64 releasableAt);
    event Vetoed(address indexed by, uint32 newRound);
    event Released(uint64 at, bool byDate);
    event Claimed(address indexed token, address indexed heir, uint256 amount);

    // ------------------------------------------------------------------ errors
    error NotOwner();
    error NotKeeper();
    error NotHeir();
    error BadState();
    error BadConfig();
    error TooEarly();
    error AlreadyConfirmed();
    error NothingToClaim();
    error TransferFailed();
    error Reentrancy();
    error VetoUsed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(
        address owner_,
        string memory itemRef_,
        Heir[] memory heirs_,
        address[] memory keepers_,
        uint8 threshold_,
        uint64 heartbeat_,
        uint64 vetoWindow_,
        uint64 releaseAfter_
    ) {
        if (owner_ == address(0)) revert BadConfig();
        owner = owner_;
        itemRef = itemRef_;
        _configure(heirs_, keepers_, threshold_, heartbeat_, vetoWindow_, releaseAfter_);
    }

    // ------------------------------------------------------------------ owner
    receive() external payable {
        emit Deposited(NATIVE, msg.sender, msg.value);
    }

    /// @notice Proof of life. Cancels any pending confirmation.
    function checkIn() external onlyOwner {
        if (state == State.Released) revert BadState();
        _checkIn();
    }

    /// @notice Replace the whole plan. Only while not released. Counts as a check-in.
    function configure(
        Heir[] calldata heirs_,
        address[] calldata keepers_,
        uint8 threshold_,
        uint64 heartbeat_,
        uint64 vetoWindow_,
        uint64 releaseAfter_
    ) external onlyOwner {
        if (state == State.Released) revert BadState();
        _configure(heirs_, keepers_, threshold_, heartbeat_, vetoWindow_, releaseAfter_);
    }

    /// @notice The owner can take anything back at any time before release. Counts as a check-in.
    function withdraw(address token, address to, uint256 amount) external nonReentrant onlyOwner {
        if (state == State.Released) revert BadState();
        if (to == address(0)) revert BadConfig();
        _checkIn();
        emit Withdrawn(token, to, amount);
        _send(token, to, amount);
    }

    // ------------------------------------------------------------------ keepers
    /// @notice A keeper confirms that the owner has been silent for longer than the heartbeat.
    function confirmSilence() external {
        if (!isKeeper[msg.sender]) revert NotKeeper();
        if (state != State.Active) revert BadState();
        if (block.timestamp < uint256(lastCheckIn) + heartbeat) revert TooEarly();
        if (confirmed[round][msg.sender]) revert AlreadyConfirmed();
        confirmed[round][msg.sender] = true;
        confirmations += 1;
        emit SilenceConfirmed(msg.sender, round, confirmations);
        if (confirmations >= threshold) {
            state = State.Confirming;
            triggeredAt = uint64(block.timestamp);
            emit Confirming(triggeredAt, triggeredAt + vetoWindow);
        }
    }

    /// @notice Any keeper may stop a confirmation in progress, once per owner check-in, so that no
    /// single keeper can block a release forever. Confirmations start again from zero.
    function veto() external {
        if (!isKeeper[msg.sender]) revert NotKeeper();
        if (state == State.Released) revert BadState();
        if (state == State.Active && confirmations == 0) revert BadState();
        if (vetoUsed[epoch][msg.sender]) revert VetoUsed();
        vetoUsed[epoch][msg.sender] = true;
        _reset();
        emit Vetoed(msg.sender, round);
    }

    // ------------------------------------------------------------------ release and claims
    /// @notice Anyone may release once the veto window has passed, or once the owner's date has come.
    function release() external {
        if (state == State.Released) revert BadState();
        bool byDate = releaseAfter != 0 && block.timestamp >= releaseAfter;
        bool byKeepers = state == State.Confirming && block.timestamp >= uint256(triggeredAt) + vetoWindow;
        if (!byDate && !byKeepers) revert TooEarly();
        state = State.Released;
        emit Released(uint64(block.timestamp), byDate && !byKeepers);
    }

    /// @notice What `heir` can claim of `token` right now (token 0 = native coin).
    function claimable(address token, address heir) public view returns (uint256) {
        if (state != State.Released) return 0;
        uint16 bps = shareOf[heir];
        if (bps == 0) return 0;
        uint256 received = _balance(token) + totalClaimed[token];
        uint256 due = (received * bps) / TOTAL_BPS;
        uint256 done = claimed[token][heir];
        return due > done ? due - done : 0;
    }

    /// @notice Pull your share of `token`. Only the heir's own address can claim.
    function claim(address token) external nonReentrant {
        if (shareOf[msg.sender] == 0) revert NotHeir();
        uint256 amount = claimable(token, msg.sender);
        if (amount == 0) revert NothingToClaim();
        claimed[token][msg.sender] += amount;
        totalClaimed[token] += amount;
        emit Claimed(token, msg.sender, amount);
        _send(token, msg.sender, amount);
    }

    // ------------------------------------------------------------------ views
    function heirs() external view returns (Heir[] memory) {
        return _heirs;
    }

    function keepers() external view returns (address[] memory) {
        return _keepers;
    }

    /// @notice Seconds until keepers may confirm silence (0 if they already can).
    function silenceIn() external view returns (uint256) {
        uint256 at = uint256(lastCheckIn) + heartbeat;
        return block.timestamp >= at ? 0 : at - block.timestamp;
    }

    // ------------------------------------------------------------------ internals
    function _configure(
        Heir[] memory heirs_,
        address[] memory keepers_,
        uint8 threshold_,
        uint64 heartbeat_,
        uint64 vetoWindow_,
        uint64 releaseAfter_
    ) internal {
        if (heirs_.length == 0 || heirs_.length > MAX_HEIRS) revert BadConfig();
        if (keepers_.length > MAX_KEEPERS) revert BadConfig();
        if (keepers_.length == 0 ? threshold_ != 0 : (threshold_ == 0 || threshold_ > keepers_.length)) revert BadConfig();
        if (keepers_.length == 0 && releaseAfter_ == 0) revert BadConfig(); // must have some way to release
        if (heartbeat_ < MIN_HEARTBEAT || heartbeat_ > MAX_HEARTBEAT) revert BadConfig();
        if (vetoWindow_ < MIN_VETO || vetoWindow_ > MAX_VETO) revert BadConfig();
        if (releaseAfter_ != 0 && releaseAfter_ <= block.timestamp) revert BadConfig();

        for (uint256 i = 0; i < _heirs.length; i++) delete shareOf[_heirs[i].account];
        delete _heirs;
        uint256 sum = 0;
        for (uint256 i = 0; i < heirs_.length; i++) {
            Heir memory h = heirs_[i];
            if (h.account == address(0) || h.bps == 0 || shareOf[h.account] != 0) revert BadConfig();
            shareOf[h.account] = h.bps;
            sum += h.bps;
            _heirs.push(h);
        }
        if (sum != TOTAL_BPS) revert BadConfig();

        for (uint256 i = 0; i < _keepers.length; i++) delete isKeeper[_keepers[i]];
        delete _keepers;
        for (uint256 i = 0; i < keepers_.length; i++) {
            address k = keepers_[i];
            if (k == address(0) || k == owner || isKeeper[k]) revert BadConfig();
            isKeeper[k] = true;
            _keepers.push(k);
        }

        threshold = threshold_;
        heartbeat = heartbeat_;
        vetoWindow = vetoWindow_;
        releaseAfter = releaseAfter_;
        _checkIn();
        emit PlanSet(heirs_, keepers_);
        emit Configured(threshold_, heartbeat_, vetoWindow_, releaseAfter_, heirs_.length, keepers_.length);
    }

    function _checkIn() internal {
        lastCheckIn = uint64(block.timestamp);
        epoch += 1;
        if (state == State.Confirming || confirmations != 0) _reset();
        emit CheckedIn(lastCheckIn);
    }

    function _reset() internal {
        state = State.Active;
        confirmations = 0;
        triggeredAt = 0;
        round += 1;
    }

    function _balance(address token) internal view returns (uint256) {
        if (token == NATIVE) return address(this).balance;
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, address(this)));
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _send(address token, address to, uint256 amount) internal {
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            if (token.code.length == 0) revert TransferFailed();
            // transfer(address,uint256); tolerate tokens that return nothing.
            (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
        }
    }
}

/// @title Cold Vault Factory
/// @notice Deploys a vault owned by the caller. Keeps a public index; holds nothing.
contract ColdVaultFactory {
    event VaultCreated(address indexed owner, address indexed vault, string itemRef);

    mapping(address => address[]) internal _vaultsOf;

    function create(
        string calldata itemRef,
        ColdVault.Heir[] calldata heirs,
        address[] calldata keepers,
        uint8 threshold,
        uint64 heartbeat,
        uint64 vetoWindow,
        uint64 releaseAfter
    ) external returns (address vault) {
        vault = address(new ColdVault(msg.sender, itemRef, heirs, keepers, threshold, heartbeat, vetoWindow, releaseAfter));
        _vaultsOf[msg.sender].push(vault);
        emit VaultCreated(msg.sender, vault, itemRef);
    }

    function vaultsOf(address owner) external view returns (address[] memory) {
        return _vaultsOf[owner];
    }
}
