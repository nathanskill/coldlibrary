/* Cold Library — Cold Vault desk. Talks to the visitor's own wallet (EIP-1193). No libraries, no RPC of our own.
   Testnet only until the contracts are audited: mainnet is refused. */
(function () {
  'use strict';
  var app = document.querySelector('[data-vault-app]');
  if (!app) return;
  var ZH = document.body.getAttribute('data-lang') === 'zh';
  function T(en, zh) { return ZH ? zh : en; }
  function $(s, el) { return (el || app).querySelector(s); }

  // Networks the desk will use. Factory addresses are filled in after deployment.
  var NETS = {
    '0xaa36a7': { name: 'Sepolia', factory: '', explorer: 'https://sepolia.etherscan.io', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', native: 'SepoliaETH' },
  };
  var DEFAULT = '0xaa36a7';
  // Local preview only: point the desk at a factory on a local chain.
  try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('cl-dev-factory')) NETS[DEFAULT].factory = localStorage.getItem('cl-dev-factory'); } catch (e) {}
  var ZERO = '0x0000000000000000000000000000000000000000';
  var SEL = {
    create: '2ea558cc', vaultsOf: '6cc811f8', checkIn: '183ff085', withdraw: 'd9caed12', confirmSilence: 'f593f36e', veto: 'ef9b78c6',
    release: '86d1a69f', claim: '1e83409a', claimable: 'd4570c1c', state: 'c19d93fb', owner: '8da5cb5b', itemRef: '223e42e9', heirs: 'd3a433e2',
    keepers: '951dc22c', threshold: '42cde4e8', heartbeat: '3defb962', vetoWindow: '514194f3', triggeredAt: '50b85dcd', releaseAfter: 'bc1ece88',
    confirmations: '9cf5d607', isKeeper: '6ba42aaa', silenceIn: 'e5741dd8',
  };
  var STATES = [T('Active', '正常'), T('Confirming · veto window', '确认中 · 否决期'), T('Released', '已发放')];

  // ---------------------------------------------------------------- ABI (just what the vault needs)
  function pad(hex) { return hex.replace(/^0x/, '').padStart(64, '0'); }
  function u(n) { return pad(BigInt(n).toString(16)); }
  function addr(a) { if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error(T('Not an address: ', '不是有效地址：') + a); return pad(a.toLowerCase()); }
  function bytesHex(str) { return Array.prototype.map.call(new TextEncoder().encode(str), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function dynString(s) { var h = bytesHex(s); var len = h.length / 2; return u(len) + (h + '0'.repeat((64 - (h.length % 64)) % 64)); }
  function dynAddrs(list) { return u(list.length) + list.map(addr).join(''); }
  function dynHeirs(list) { return u(list.length) + list.map(function (h) { return addr(h[0]) + u(h[1]); }).join(''); }
  // params: [{dyn:true, data:hex}|{dyn:false, data:hex}]
  function encode(params) {
    var head = '', tail = '', headLen = params.length * 32;
    params.forEach(function (p) {
      if (p.dyn) { head += u(headLen + tail.length / 2); tail += p.data; } else head += p.data;
    });
    return head + tail;
  }
  function word(hex, i) { return hex.slice(2 + i * 64, 2 + (i + 1) * 64); }
  function wNum(hex, i) { return BigInt('0x' + (word(hex, i) || '0')); }
  function wAddr(hex, i) { return '0x' + word(hex, i).slice(24); }
  function decAddrArray(hex) { var off = Number(wNum(hex, 0)) / 32, n = Number(wNum(hex, off)), out = []; for (var i = 0; i < n; i++) out.push(wAddr(hex, off + 1 + i)); return out; }
  function decHeirs(hex) { var off = Number(wNum(hex, 0)) / 32, n = Number(wNum(hex, off)), out = []; for (var i = 0; i < n; i++) out.push([wAddr(hex, off + 1 + 2 * i), Number(wNum(hex, off + 2 + 2 * i))]); return out; }
  function decString(hex) { var off = Number(wNum(hex, 0)) / 32, len = Number(wNum(hex, off)); var h = hex.slice(2 + (off + 1) * 64, 2 + (off + 1) * 64 + len * 2); var b = new Uint8Array(len); for (var i = 0; i < len; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(b); }

  function fmtEth(wei) { var s = BigInt(wei).toString().padStart(19, '0'); var i = s.slice(0, -18), f = s.slice(-18).replace(/0+$/, '').slice(0, 6); return i + (f ? '.' + f : ''); }
  function parseEth(v) { v = String(v).trim(); if (!/^\d+(\.\d{1,18})?$/.test(v)) throw new Error(T('Amount like 0.01', '金额格式如 0.01')); var p = v.split('.'); return BigInt(p[0]) * 10n ** 18n + BigInt((p[1] || '').padEnd(18, '0')); }
  function short(a) { return a.slice(0, 6) + '…' + a.slice(-4); }
  function days(sec) { return Math.round(Number(sec) / 86400); }

  // ---------------------------------------------------------------- wallet
  var eth = window.ethereum, account = null, chain = null;
  var status = $('[data-v-status]'), msg = $('[data-v-msg]');
  function say(t, bad) { msg.textContent = t; msg.classList.toggle('bad', !!bad); }
  function net() { return NETS[chain]; }
  function call(to, data) { return eth.request({ method: 'eth_call', params: [{ to: to, data: '0x' + data }, 'latest'] }); }
  function send(to, data, value) {
    var tx = { from: account, to: to, data: '0x' + data };
    if (value) tx.value = '0x' + value.toString(16);
    say(T('Please confirm in your wallet…', '请在钱包里确认……'));
    return eth.request({ method: 'eth_sendTransaction', params: [tx] }).then(function (hash) {
      say(T('Sent. Waiting for the block… ', '已发送，等待上链…… ') + short(hash));
      return new Promise(function (res, rej) {
        (function poll(n) {
          eth.request({ method: 'eth_getTransactionReceipt', params: [hash] }).then(function (r) {
            if (r) { if (r.status === '0x1') { say(T('Done.', '完成。')); res(r); } else { say(T('The transaction failed on chain.', '交易在链上执行失败。'), true); rej(new Error('reverted')); } }
            else if (n > 120) rej(new Error('timeout')); else setTimeout(function () { poll(n + 1); }, 3000);
          }, rej);
        })(0);
      });
    }, function (e) { say((e && e.message) || T('Cancelled.', '已取消。'), true); throw e; });
  }

  function render() {
    if (!eth) { status.textContent = T('No wallet found in this browser.', '这个浏览器里没有找到钱包。'); return; }
    if (!account) { status.textContent = T('Not connected.', '未连接。'); $('[data-v-connected]').hidden = true; return; }
    var n = net();
    status.textContent = short(account) + ' · ' + (n ? n.name : (chain === '0x1' ? T('Ethereum mainnet (refused until audit)', '以太坊主网（审计前拒绝使用）') : T('unsupported network ', '不支持的网络 ') + chain));
    $('[data-v-switch]').hidden = !!n;
    $('[data-v-connected]').hidden = !n;
    if (n && !n.factory) say(T('The vault factory is not deployed on this network yet. Everything else here is ready.', '冷库工厂合约还没部署到这个网络，其余功能都已就绪。'), true);
    if (n && n.factory) loadMine();
  }

  function connect() {
    if (!eth && window.ethereum) { eth = window.ethereum; listen(); }
    if (!eth) { render(); return Promise.reject(new Error(T('No wallet found in this browser.', '这个浏览器里没有找到钱包。'))); }
    return eth.request({ method: 'eth_requestAccounts' }).then(function (a) { account = a[0]; return eth.request({ method: 'eth_chainId' }); }).then(function (c) { chain = c; render(); });
  }
  function switchNet() {
    var target = DEFAULT, n = NETS[target];
    return eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target }] }).catch(function (e) {
      if (e && e.code === 4902) return eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId: target, chainName: n.name, nativeCurrency: { name: n.native, symbol: 'ETH', decimals: 18 }, rpcUrls: [n.rpc], blockExplorerUrls: [n.explorer] }] });
      throw e;
    });
  }
  function listen() {
    eth.on && eth.on('accountsChanged', function (a) { account = a[0] || null; render(); });
    eth.on && eth.on('chainChanged', function (c) { chain = c; render(); });
  }
  if (eth) {
    listen();
    eth.request({ method: 'eth_accounts' }).then(function (a) { if (a && a[0]) { account = a[0]; return eth.request({ method: 'eth_chainId' }).then(function (c) { chain = c; render(); }); } render(); });
  } else render();
  $('[data-v-connect]').addEventListener('click', function () { connect().catch(function (e) { say(e.message, true); }); });
  $('[data-v-switch]').addEventListener('click', function () { switchNet().catch(function (e) { say(e.message, true); }); });

  // ---------------------------------------------------------------- read a vault
  function readVault(v) {
    var q = function (s, args) { return call(v, SEL[s] + (args || '')); };
    return Promise.all([q('state'), q('owner'), q('itemRef'), q('heirs'), q('keepers'), q('threshold'), q('heartbeat'), q('vetoWindow'), q('releaseAfter'), q('confirmations'), q('silenceIn'), q('triggeredAt'),
      eth.request({ method: 'eth_getBalance', params: [v, 'latest'] }), account ? q('claimable', addr(ZERO) + addr(account)) : '0x0', account ? q('isKeeper', addr(account)) : '0x0', eth.request({ method: 'eth_getBlockByNumber', params: ['latest', false] })])
      .then(function (r) {
        return { address: v, state: Number(wNum(r[0], 0)), owner: wAddr(r[1], 0), itemRef: decString(r[2]), heirs: decHeirs(r[3]), keepers: decAddrArray(r[4]), threshold: Number(wNum(r[5], 0)),
          heartbeat: wNum(r[6], 0), veto: wNum(r[7], 0), releaseAfter: Number(wNum(r[8], 0)), confirmations: Number(wNum(r[9], 0)), silenceIn: wNum(r[10], 0), triggeredAt: Number(wNum(r[11], 0)),
          balance: BigInt(r[12]), claimable: BigInt(r[13] === '0x' ? 0 : r[13]), isKeeper: wNum(r[14], 0) === 1n, now: Number(BigInt(r[15].timestamp)) };
      });
  }

  function vaultCard(x) {
    var me = account.toLowerCase(), isOwner = x.owner.toLowerCase() === me;
    var myShare = x.heirs.filter(function (h) { return h[0].toLowerCase() === me; })[0];
    var el = document.createElement('div'); el.className = 'vault-card';
    var rows = [
      [T('Vault', '冷库'), '<a href="' + net().explorer + '/address/' + x.address + '" rel="noopener">' + short(x.address) + '</a>'],
      [T('State', '状态'), STATES[x.state]],
      [T('Balance', '余额'), fmtEth(x.balance) + ' ETH'],
      [T('Heirs', '继承人'), x.heirs.map(function (h) { return short(h[0]) + ' · ' + (h[1] / 100) + '%'; }).join('<br>')],
      [T('Keepers', '开启人'), x.keepers.length ? x.threshold + ' / ' + x.keepers.length + ' · ' + x.keepers.map(short).join(', ') : T('none', '无')],
      [T('Silence period', '失联期'), days(x.heartbeat) + T(' days', ' 天') + (x.state === 0 ? (x.silenceIn > 0n ? T(' · keepers may confirm in ', ' · 开启人还要等 ') + days(x.silenceIn) + T(' days', ' 天') : T(' · keepers may confirm now', ' · 开启人现在可以确认')) : '')],
      [T('Veto window', '否决期'), days(x.veto) + T(' days', ' 天')],
      [T('Date release', '定时发放'), x.releaseAfter ? new Date(x.releaseAfter * 1000).toLocaleString() : T('none', '无')],
    ];
    if (x.itemRef) rows.splice(1, 0, [T('Linked to', '关联'), x.itemRef.replace(/[<>&"]/g, '')]);
    el.innerHTML = '<dl class="kv">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl><div class="btns mt-1" data-actions></div>';
    var acts = el.querySelector('[data-actions]');
    function btn(label, fn, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'ghost'); b.textContent = label; b.addEventListener('click', function () { fn().then(function () { refresh(x.address, el); }).catch(function () {}); }); acts.appendChild(b); }
    if (isOwner && x.state !== 2) {
      btn(T('Check in', '报到'), function () { return send(x.address, SEL.checkIn); }, '');
      btn(T('Deposit', '存入'), function () { var v = prompt(T('Amount in ETH', '存入多少 ETH')); if (!v) return Promise.reject(); return send(x.address, '', parseEth(v)); });
      btn(T('Withdraw to me', '取回到我的钱包'), function () { var v = prompt(T('Amount in ETH', '取回多少 ETH')); if (!v) return Promise.reject(); return send(x.address, SEL.withdraw + addr(ZERO) + addr(account) + u(parseEth(v))); });
    }
    if (x.isKeeper && x.state === 0 && x.silenceIn === 0n) btn(T('Confirm silence', '确认失联'), function () { return send(x.address, SEL.confirmSilence); }, 'ember');
    if (x.isKeeper && (x.state === 1 || (x.state === 0 && x.confirmations > 0))) btn(T('Veto', '叫停'), function () { return send(x.address, SEL.veto); });
    var now = x.now; // chain time, not the visitor's clock
    if (x.state !== 2 && ((x.releaseAfter && now >= x.releaseAfter) || (x.state === 1 && now >= x.triggeredAt + Number(x.veto)))) btn(T('Release', '发放'), function () { return send(x.address, SEL.release); }, 'ember');
    if (myShare && x.state === 2 && x.claimable > 0n) btn(T('Claim ', '领取 ') + fmtEth(x.claimable) + ' ETH', function () { return send(x.address, SEL.claim + addr(ZERO)); }, 'ember');
    if (myShare) { var p = document.createElement('p'); p.className = 'faint mt-1'; p.textContent = T('You are an heir of this vault: ', '你是这个冷库的继承人：') + (myShare[1] / 100) + '%'; el.appendChild(p); }
    return el;
  }
  function refresh(v, el) { readVault(v).then(function (x) { var n = vaultCard(x); el.replaceWith(n); }); }

  function loadMine() {
    var box = $('[data-v-mine]'); box.innerHTML = '';
    call(net().factory, SEL.vaultsOf + addr(account)).then(function (hex) {
      var list = decAddrArray(hex);
      if (!list.length) { box.innerHTML = '<p class="faint">' + T('You have no vaults on this network yet.', '你在这个网络上还没有冷库。') + '</p>'; return; }
      list.reverse().forEach(function (v) { var ph = document.createElement('div'); box.appendChild(ph); readVault(v).then(function (x) { ph.replaceWith(vaultCard(x)); }); });
    });
  }

  // look up any vault (as keeper or heir)
  $('[data-v-lookup]').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('input', e.target).value.trim(); var box = $('[data-v-found]'); box.innerHTML = '';
    try { addr(v); } catch (err) { say(err.message, true); return; }
    readVault(v).then(function (x) { box.appendChild(vaultCard(x)); }, function () { say(T('That address is not a Cold Vault on this network.', '这个地址在当前网络上不是冷库。'), true); });
  });

  // ---------------------------------------------------------------- create
  var form = $('[data-v-create]');
  function row(kind) {
    var d = document.createElement('div'); d.className = 'qrow';
    d.innerHTML = kind === 'heir'
      ? '<label>' + T('Heir wallet address', '继承人钱包地址') + '<input type="text" name="heir" placeholder="0x…" required></label><label>' + T('Share %', '比例 %') + '<input type="text" name="share" inputmode="decimal" required></label>'
      : '<label>' + T('Keeper wallet address', '开启人钱包地址') + '<input type="text" name="keeper" placeholder="0x…" required></label><span></span>';
    return d;
  }
  $('[data-v-add-heir]').addEventListener('click', function () { $('[data-v-heirs]').appendChild(row('heir')); });
  $('[data-v-add-keeper]').addEventListener('click', function () { $('[data-v-keepers]').appendChild(row('keeper')); });
  $('[data-v-heirs]').appendChild(row('heir'));
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      var heirs = [].map.call(form.querySelectorAll('input[name="heir"]'), function (a, i) { return [a.value.trim(), Math.round(parseFloat(form.querySelectorAll('input[name="share"]')[i].value) * 100)]; });
      var total = heirs.reduce(function (s, h) { return s + h[1]; }, 0);
      if (total !== 10000) throw new Error(T('Shares must add up to exactly 100%. Now: ', '比例合计必须正好 100%，现在是 ') + total / 100 + '%');
      var keepers = [].map.call(form.querySelectorAll('input[name="keeper"]'), function (a) { return a.value.trim(); });
      var threshold = keepers.length ? Number(form.threshold.value) : 0;
      if (keepers.length && (threshold < 1 || threshold > keepers.length)) throw new Error(T('Confirmations needed must be between 1 and the number of keepers.', '需要的确认人数必须在 1 到开启人数之间。'));
      var hb = Number(form.heartbeat.value) * 86400, veto = Number(form.veto.value) * 86400;
      var rel = form.release.value ? Math.floor(new Date(form.release.value).getTime() / 1000) : 0;
      if (!keepers.length && !rel) throw new Error(T('Without keepers, set a release date.', '没有开启人时，必须设定一个发放日期。'));
      var data = SEL.create + encode([
        { dyn: true, data: dynString(form.itemRef.value.trim()) }, { dyn: true, data: dynHeirs(heirs) }, { dyn: true, data: dynAddrs(keepers) },
        { dyn: false, data: u(threshold) }, { dyn: false, data: u(hb) }, { dyn: false, data: u(veto) }, { dyn: false, data: u(rel) },
      ]);
    } catch (err) { say(err.message, true); return; }
    send(net().factory, data).then(function () { form.reset(); loadMine(); }).catch(function () {});
  });
})();
