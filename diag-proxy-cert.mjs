/**
 * 决定性测试：穿过本地代理（127.0.0.1:65532）建立到 home.xiaoaijiang.cloud:443 的 TLS，
 * 看代理返回的证书到底是什么 —— 与直连对比。
 * 这正是浏览器走代理时看到的东西。
 */
import net from 'node:net';
import tls from 'node:tls';

const HOST = 'home.xiaoaijiang.cloud';
const PROXY = { host: '127.0.0.1', port: 65532 };

function tlsViaProxy() {
  return new Promise((resolve) => {
    const raw = net.connect(PROXY.port, PROXY.host, () => {
      raw.write('CONNECT ' + HOST + ':443 HTTP/1.1\r\nHost: ' + HOST + ':443\r\n\r\n');
    });
    let buf = '';
    const onData = (d) => {
      buf += d.toString('latin1');
      if (buf.includes('\r\n\r\n')) {
        raw.removeListener('data', onData);
        const status = buf.split('\r\n')[0];
        if (!/ 200 /.test(status)) { resolve({ 结论: '代理拒绝 CONNECT: ' + status }); raw.destroy(); return; }
        const s = tls.connect({ socket: raw, servername: HOST, rejectUnauthorized: false }, () => {
          const c = s.getPeerCertificate(false);
          resolve({
            通道: '经代理 127.0.0.1:65532',
            authorized: s.authorized,
            错误: s.authorizationError || '(无)',
            CN: c.subject && c.subject.CN,
            颁发者: c.issuer && (c.issuer.O || c.issuer.CN),
            SAN: String(c.subjectaltname || '').slice(0, 200),
            有效期: (c.valid_from || '') + ' → ' + (c.valid_to || ''),
            协议: s.getProtocol && s.getProtocol(),
          });
          s.end();
        });
        s.on('error', e => resolve({ 通道: '经代理', 错误: e.code + ' ' + e.message }));
      }
    };
    raw.on('data', onData);
    raw.on('error', e => resolve({ 通道: '经代理', 错误: '连接代理失败 ' + e.code }));
    setTimeout(() => resolve({ 通道: '经代理', 错误: '超时' }), 15000);
  });
}

function tlsDirect() {
  return new Promise((resolve) => {
    const s = tls.connect({ host: HOST, port: 443, servername: HOST, rejectUnauthorized: false, timeout: 15000 }, () => {
      const c = s.getPeerCertificate(false);
      resolve({
        通道: '直连',
        authorized: s.authorized,
        错误: s.authorizationError || '(无)',
        CN: c.subject && c.subject.CN,
        颁发者: c.issuer && (c.issuer.O || c.issuer.CN),
        SAN: String(c.subjectaltname || '').slice(0, 200),
        有效期: (c.valid_from || '') + ' → ' + (c.valid_to || ''),
        协议: s.getProtocol && s.getProtocol(),
      });
      s.end();
    });
    s.on('error', e => resolve({ 通道: '直连', 错误: e.code + ' ' + e.message }));
    s.on('timeout', () => { resolve({ 通道: '直连', 错误: '超时' }); s.destroy(); });
  });
}

console.log('════ 直连 ════');
console.log(JSON.stringify(await tlsDirect(), null, 2));
console.log('\n════ 经本地代理（浏览器走的就是这条路）════');
const via = await tlsViaProxy();
console.log(JSON.stringify(via, null, 2));

console.log('\n════ 判定 ════');
if (via.CN && via.CN !== HOST) {
  console.log('  ❌ 代理返回的证书 CN 是「' + via.CN + '」，不是 ' + HOST + ' —— 这就是浏览器报错的原因');
} else if (via.错误 && via.错误 !== '(无)') {
  console.log('  ⚠ 经代理时证书校验失败: ' + via.错误);
} else if (via.authorized) {
  console.log('  ✅ 经代理时证书也正常，浏览器报错可能另有原因（缓存/扩展/DoH）');
} else {
  console.log('  ? 结果不明确，见上面明细');
}
