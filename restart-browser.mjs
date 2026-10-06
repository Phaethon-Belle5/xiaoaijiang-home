// 重启无头 Chrome（测试链路依赖 9222 端口）
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UDD = 'B:\\dell\\Documents\\harness\\.chrome-headless';

// 先关掉旧的
for (const name of ['chrome.exe']) {
  try {
    const { execSync } = await import('node:child_process');
    execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='${name}'\\" | Where-Object { $_.CommandLine -like '*chrome-headless*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
  } catch (e) {}
}
await new Promise(r => setTimeout(r, 2500));

if (!existsSync(EXE)) { console.log('❌ 找不到 Chrome: ' + EXE); process.exit(1); }

const p = spawn(EXE, [
  '--headless=new', '--remote-debugging-port=9222', '--remote-allow-origins=*',
  '--user-data-dir=' + UDD, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--disable-dev-shm-usage', 'about:blank',
], { detached: true, stdio: 'ignore' });
p.unref();

for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 1000));
  try {
    const j = await (await fetch('http://127.0.0.1:9222/json/version', { signal: AbortSignal.timeout(3000) })).json();
    console.log('✅ 无头 Chrome 就绪: ' + j.Browser);
    process.exit(0);
  } catch (e) {}
}
console.log('❌ 启动超时');
process.exit(1);
