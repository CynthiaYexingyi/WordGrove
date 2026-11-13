/* 词林 · 端到端验收脚本（通过 Chrome DevTools Protocol 驱动无头 Edge）
用法: node tools/qa_cdp.cjs <项目根目录>
前置: 无头 Edge 以 --remote-debugging-port=9222 打开 index.html
输出: build/qa-report.json + build/shots/qa-*.png
*/
const net = require("net");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || process.cwd();
const SHOTS = path.join(ROOT, "build", "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
let seq = 0;

function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail != null ? "  " + detail : ""));
}
function failSoft(name, e) {
  results.push({ name, ok: false, detail: String((e && e.message) || e) });
  console.log("FAIL " + name + "  " + String((e && e.message) || e));
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.handlers = new Map();
    this.events = [];
    socket.on("data", (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.parse();
    });
  }
  parse() {
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const opcode = b0 & 0x0f;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const payload = this.buf.slice(off, off + len);
      this.buf = this.buf.slice(off + len);
      if (opcode === 1) {
        try {
          const msg = JSON.parse(payload.toString("utf8"));
          if (msg.id && this.handlers.has(msg.id)) {
            const h = this.handlers.get(msg.id);
            this.handlers.delete(msg.id);
            h(msg);
          } else if (msg.method) {
            this.events.push(msg);
            if (msg.method === "Runtime.exceptionThrown") {
              errors.push("exception: " + JSON.stringify(msg.params.exceptionDetails && msg.params.exceptionDetails.text || ""));
            }
            if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
              errors.push("console: " + (msg.params.args || []).map((a) => a.value || a.description || "").join(" "));
            }
          }
        } catch (e) { errors.push("ws parse: " + e.message); }
      } else if (opcode === 8) {
        errors.push("ws closed");
      } else if (opcode === 9) {
        this.sendRaw(Buffer.from([0x8a, 0x80, 0, 0, 0, 0]));
      }
    }
  }
  sendRaw(frame) { this.socket.write(frame); }
  send(method, params) {
    const id = ++seq;
    const data = Buffer.from(JSON.stringify({ id, method, params: params || {} }));
    const mask = crypto.randomBytes(4);
    const len = data.length;
    let header;
    if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0xfe; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0xff; header.writeBigUInt64BE(BigInt(len), 2); }
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
    this.sendRaw(Buffer.concat([header, mask, masked]));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.handlers.delete(id); reject(new Error("CDP timeout: " + method)); }, 60000);
      this.handlers.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(method + ": " + JSON.stringify(msg.error)));
        else resolve(msg.result);
      });
    });
  }
}

async function connect(wsUrl) {
  const u = new URL(wsUrl);
  const socket = net.connect({ host: u.hostname, port: Number(u.port) });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  const key = crypto.randomBytes(16).toString("base64");
  socket.write(
    `GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\n` +
    `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
  );
  let buf = Buffer.alloc(0);
  const cdp = await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf("\r\n\r\n");
      if (idx < 0) return;
      const head = buf.slice(0, idx).toString();
      if (!/101/.test(head)) { reject(new Error("WS handshake failed: " + head)); return; }
      socket.removeListener("data", onData);
      const client = new CDP(socket);
      const rest = buf.slice(idx + 4);
      if (rest.length) socket.emit("data", rest);
      resolve(client);
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
  return cdp;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  // 等待调试端口
  let pages = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:9222/json/list");
      pages = await r.json();
      if (pages && pages.length) break;
    } catch (e) {}
    await sleep(500);
  }
  if (!pages || !pages.length) throw new Error("找不到 Edge 调试页面");
  const page = pages.find((p) => p.url.indexOf("index.html") >= 0) || pages[0];
  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");

  async function evalJs(expression) {
    const r = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (r.exceptionDetails) throw new Error("JS: " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result && r.result.value;
  }
  async function shot(name) {
    // 无头截图时入场动画可能未提交，停用动画让遮罩可见
    await evalJs("(function(){if(!document.getElementById('qa-noanim')){const s=document.createElement('style');s.id='qa-noanim';s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.head.appendChild(s);}return 1;})()");
    await sleep(350);
    const r = await cdp.send("Page.captureScreenshot", { format: "png" });
    const file = path.join(SHOTS, "qa-" + name + ".png");
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    return file;
  }
  async function waitFor(expr, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeout || 8000)) {
      if (await evalJs("!!(" + expr + ")")) return true;
      await sleep(120);
    }
    return false;
  }

  try {
    check("app.boot", await waitFor("window.CILIN && CILIN.words && CILIN.words.length", 15000), "词林启动");
    const data = await evalJs(`({
      words: CILIN.words.length, core: CILIN.coreWords.length, units: CILIN.units.length,
      cet4: CILIN.words.filter(w=>w.level!=="cet6").length, cet6: CILIN.words.filter(w=>w.level==="cet6").length,
      rich: CILIN.words.filter(w=>w.rich).length, ex: CILIN.words.filter(w=>w.ex).length,
      enDef: CILIN.words.filter(w=>w.enDef).length,
      exZhMissing: CILIN.words.filter(w=>w.ex && !w.exZh).length,
      exMissing: CILIN.words.filter(w=>!w.ex).length,
      sentZh: Object.keys(CILIN.sentZh || {}).length,
      zhMissing: CILIN.words.filter(w=>!w.zh).length,
      mnemonicMissing: CILIN.words.filter(w=>!w.mnemonic).length,
      extraTexts: CILIN.units.filter(u=>u.extra).reduce((n,u)=>n+u.texts.length,0),
      extraUnits: CILIN.units.filter(u=>u.extra).length,
      synFilled: CILIN.words.filter(w=>w.syn && w.syn.length).length,
      newQ: { cloze3: (CILIN.questions.cloze3||[]).length, match15: (CILIN.questions.match15||[]).length,
        translation_u14a: (CILIN.questions.translation_u14a||[]).length,
        paraphrase_u14a: (CILIN.questions.paraphrase_u14a||[]).length,
        textbook: (CILIN.questions.textbook||[]).length },
      q: Object.keys(CILIN.questions).reduce((o,k)=>(o[k]=CILIN.questions[k].length,o),{})
    })`);
    check("data.words", data.words === 5546, JSON.stringify(data));
    check("data.core", data.core === 600, data.core);
    check("data.rich", data.rich === 600, data.rich);
    check("data.cet6", data.cet4 === 4349 && data.cet6 === 1197, JSON.stringify({ cet4: data.cet4, cet6: data.cet6 }));
    check("data.enDef", data.enDef === data.words, data.enDef);
    check("data.exZh", data.exZhMissing === 0 && data.sentZh >= 800, JSON.stringify({ missing: data.exZhMissing, sentZh: data.sentZh }));
    check("data.examples", data.exMissing === 0 && data.ex === data.words, JSON.stringify({ exMissing: data.exMissing, withEx: data.ex }));
    check("data.lex", data.zhMissing === 0 && data.mnemonicMissing === 0, JSON.stringify({ zhMissing: data.zhMissing, mnemonicMissing: data.mnemonicMissing }));
    check("data.articles", data.extraTexts >= 8, JSON.stringify({ extraTexts: data.extraTexts }));
    check("data.units", data.units === 8 && data.extraUnits === 1, JSON.stringify({ units: data.units, extraUnits: data.extraUnits }));
    check("data.questions", data.q.reading === 4 && data.q.cloze === 3 && data.q.matching === 2 && data.q.translation === 8 && data.q.writing === 6 && data.q.listening === 4, JSON.stringify(data.q));
    check("data.syn", data.synFilled >= 5300, JSON.stringify({ filled: data.synFilled }));
    check("data.newtraining", data.newQ.cloze3 >= 16 && data.newQ.match15 >= 4 && data.newQ.translation_u14a >= 8 && data.newQ.paraphrase_u14a >= 8 && data.newQ.textbook >= 6, JSON.stringify(data.newQ));

    if (process.env.QA_PROBE) {
      await evalJs("localStorage.clear(); CILIN.store.reset(); CILIN.go('/today'); 1");
      await sleep(500);
      await evalJs("document.querySelector('[data-start]').click(); 1");
      await sleep(500);
      const info = await evalJs(`(function(){
        const ov=document.getElementById('overlay');
        const sheet=ov.querySelector('.sheet');
        const cs=getComputedStyle(ov), ss=sheet?getComputedStyle(sheet):null;
        const r=ov.getBoundingClientRect();
        const el=document.elementFromPoint(600,400);
        return { cls: ov.className, display: cs.display, opacity: cs.opacity, z: cs.zIndex,
          bg: cs.backgroundColor, rect: [r.x,r.y,r.width,r.height],
          sheetOpacity: ss&&ss.opacity, sheetTransform: ss&&ss.transform, sheetHeight: sheet&&sheet.getBoundingClientRect().height,
          hit: el && (el.className||el.tagName), text: ov.innerText.slice(0,60) };
      })()`);
      console.log("PROBE", JSON.stringify(info));
      let r1 = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      fs.writeFileSync(path.join(SHOTS, "probe-surface.png"), Buffer.from(r1.data, "base64"));
      let r2 = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      fs.writeFileSync(path.join(SHOTS, "probe-view.png"), Buffer.from(r2.data, "base64"));
      console.log("probe shots written");
      process.exit(0);
    }


    // 干净状态
    await evalJs("localStorage.clear(); CILIN.store.reset(); CILIN.go('/today'); 1");
    await sleep(500);

    // 0. 训练入口：点开题目后不应立刻消失（回归用例）
    const trainLaunch = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/train'); await s(600);
      document.querySelector('[data-train="vocab"]').click(); await s(350);
      const modeSheet = document.querySelector('#overlay').innerText.includes('混合出题');
      const modeBtn = document.querySelector('[data-mode="en2zh"]'); if(modeBtn) modeBtn.click(); await s(800);
      const ov=document.getElementById('overlay');
      const visible = getComputedStyle(ov).display !== 'none' && !ov.classList.contains('hidden');
      const quiz = !!document.querySelector('.q-wrap .q-stem');
      return { modeSheet, visible, quiz }; })()`);
    check("train.launch.vocab", trainLaunch && trainLaunch.modeSheet && trainLaunch.visible && trainLaunch.quiz, JSON.stringify(trainLaunch));
    await evalJs("(function(){const b=document.querySelector('#overlay .session-top [data-close]'); if(b) b.click(); return 0;})()");
    await sleep(400);

    const readLaunch = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/train'); await s(600);
      document.querySelector('[data-train="reading"]').click(); await s(350);
      const pick = document.querySelector('[data-pick]'); if(pick) pick.click(); await s(900);
      const ov=document.getElementById('overlay');
      const visible = getComputedStyle(ov).display !== 'none' && !ov.classList.contains('hidden');
      const passage = !!document.querySelector('.passage');
      return { visible, passage }; })()`);
    check("train.launch.reading", readLaunch && readLaunch.visible && readLaunch.passage, JSON.stringify(readLaunch));
    await evalJs("(function(){const b=document.querySelector('#overlay .session-top [data-close]'); if(b) b.click(); return 0;})()");
    await sleep(500);
    // 0.5 阅读：列表、点词查义（含英文释义）、未收录词、生词高亮
    const readList = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read'); await s(700);
      return { cards: document.querySelectorAll('.read-card').length, nav: !!document.querySelector('#nav a[data-route="read"]') }; })()`);
    check("read.list", readList && readList.cards >= 21 && readList.nav, JSON.stringify(readList));
    await shot("read-list");

    const reader = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u5b'); await s(800);
      const paras = document.querySelectorAll('.reader-body p').length;
      const tokens = document.querySelectorAll('.rd-token').length;
      const readSaved = !!CILIN.store.state.reading['u5b'];
      const body = document.querySelector('#readerBody');
      const startOn = !body.classList.contains('no-hl');
      const hl = document.querySelector('#hlToggle'); hl.click(); await s(120);
      const off = body.classList.contains('no-hl');
      hl.click(); await s(120);
      const on = !body.classList.contains('no-hl');
      return { paras, tokens, readSaved, startOn, off, on }; })()`);
    check("read.open", reader && reader.paras >= 5 && reader.tokens > 200 && reader.readSaved && reader.startOn && reader.off && reader.on, JSON.stringify(reader));
    const paraFix = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u4a'); await s(800);
      const ps=[...document.querySelectorAll('.reader-body p')].map(function(p){return p.innerText;});
      const text=ps.join(' ');
      const leading=ps.filter(function(p){return /^[0-9]/.test(p);}).length;
      return { paras: ps.length, leading: leading, stray: text.indexOf('researcher. 2 Recently') >= 0, sample: text.slice(0,120) }; })()`);
    check("read.paragraphs", paraFix && paraFix.paras >= 5 && paraFix.leading === 0 && !paraFix.stray, JSON.stringify(paraFix));
    await evalJs("CILIN.go('/read/u5b'); 1"); await sleep(800);
    await shot("read-view");

    const wordSheet = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const brain = document.querySelector('[data-rdw="brain"]');
      if (!brain) return { miss: true };
      brain.click(); await s(450);
      const text = document.querySelector('.sheet') ? document.querySelector('.sheet').innerText : '';
      const audioCount = document.querySelectorAll('#overlay [data-speak]').length;
      return { miss: false, text: text.slice(0, 600), audioCount }; })()`);
    check("read.word", wordSheet && !wordSheet.miss && /英文释义/.test(wordSheet.text) && /the organ inside the head/.test(wordSheet.text) && /在过去十年/.test(wordSheet.text) && wordSheet.audioCount >= 2, JSON.stringify(wordSheet));
    await shot("read-word");
    await evalJs("(function(){const b=document.querySelector('#overlay [data-close]'); if(b) b.click(); return 0;})()");
    await sleep(400);

    const extraRead = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const ext = CILIN.units.filter(function (u) { return u.extra; })[0];
      if (!ext) return { miss: true };
      const tid = ext.texts[0].id;
      CILIN.go('/read/' + tid); await s(800);
      const paras = document.querySelectorAll('.reader-body p').length;
      const tokens = document.querySelectorAll('.rd-token').length;
      const known = document.querySelectorAll('.rd-token[data-rdw]').length;
      const textWords = (CILIN.textWords[tid] || []).length;
      return { paras: paras, tokens: tokens, known: known, textWords: textWords, title: ext.texts[0].title }; })()`);
    check("read.extra", extraRead && !extraRead.miss && extraRead.paras >= 3 && extraRead.tokens > 150 && extraRead.textWords >= 20, JSON.stringify(extraRead));

    const hlPersist = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u5b'); await s(700);
      const body = document.querySelector('#readerBody');
      const before = !body.classList.contains('no-hl');
      const token = document.querySelector('[data-rdw="brain"]');
      token.click(); await s(400);
      const know = document.querySelector('#overlay [data-know]');
      if (!know) return { miss: 'no-know' };
      know.click(); await s(700);
      const after = !!document.querySelector('#readerBody') && !document.querySelector('#readerBody').classList.contains('no-hl');
      return { before, after }; })()`);
    check("read.highlight.persist", hlPersist && hlPersist.before && hlPersist.after, JSON.stringify(hlPersist));

    const unknown = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u5b'); await s(700);
      const t = document.querySelector('.rd-token.rd-unknown');
      if (!t) return { miss: true };
      t.click(); await s(400);
      const text = document.querySelector('.sheet') ? document.querySelector('.sheet').innerText : '';
      const b = document.querySelector('#overlay [data-close2]'); if (b) b.click();
      await s(350);
      return { text: text.slice(0,120), miss: false }; })()`);
    check("read.unknown", unknown && !unknown.miss && /不在.*大纲词库/.test(unknown.text), JSON.stringify(unknown));
    const custom = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u5b'); await s(700);
      const t=document.querySelector('.rd-token.rd-unknown'); if(!t) return { miss:'no-token' };
      t.click(); await s(350);
      const add=document.querySelector('#overlay [data-add-custom]'); if(!add) return { miss:'no-add' };
      add.click(); await s(350);
      const key='qacustom'+String.fromCharCode(97+Math.floor(Math.random()*26))+String.fromCharCode(97+Math.floor(Math.random()*26));
      document.querySelector('#cwW').value=key;
      document.querySelector('#cwZh').value='测试词义';
      document.querySelector('#cwEx').value='This is a test sentence for the custom word.';
      document.querySelector('#cwExZh').value='这是一个测试句。';
      document.querySelector('#overlay [data-save-today]').click(); await s(900);
      const ok=!!CILIN.wordMap[key] && !!CILIN.store.state.customWords[key] && CILIN.customWords.some(function(x){return x.w===key;});
      const queued=CILIN.store.queueWords().some(function(x){return x.w===key;});
      const card=!!document.querySelector('#overlay [data-today]');
      const resolved=!!CILIN.resolveWord(key);
      const saved=JSON.parse(localStorage.getItem('cilin.v1')||'{}');
      const stored=!!(saved.customWords && saved.customWords[key]);
      CILIN.store.removeCustomWord(key); CILIN.unregisterCustomWord(key);
      return { ok:ok, queued:queued, card:card, resolved:resolved, stored:stored, miss:false }; })()`);
    check("custom.add", custom && !custom.miss && custom.ok && custom.queued && custom.card && custom.resolved && custom.stored, JSON.stringify(custom));

    // 六级词表、词汇范围、加入今日闭环
    const six = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/grove'); await s(600);
      document.querySelector('[data-level="cet6"]').click(); await s(500);
      const rows = document.querySelectorAll('.word-list .word-row').length;
      const badges = document.querySelectorAll('.word-list .word-row .pill.gold').length;
      const first = document.querySelector('.word-list .word-row');
      if (first) first.click();
      await s(400);
      const text = document.querySelector('.sheet') ? document.querySelector('.sheet').innerText : '';
      const b = document.querySelector('#overlay [data-close]'); if (b) b.click();
      await s(350);
      return { rows, badges, text: text.slice(0, 120) }; })()`);
    check("grove.cet6", six && six.rows >= 60 && six.badges >= 60 && /CET-6/.test(six.text), JSON.stringify(six));
    await shot("grove-cet6");

    const scope = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const old = CILIN.store.state.settings.vocabScope;
      CILIN.store.state.settings.vocabScope = 'cet6';
      const pool = CILIN.studyPool();
      const plan = CILIN.store.plan();
      const allSix = pool.every(function (w) { return w.level === 'cet6'; });
      const freshSix = plan.fresh.every(function (w) { return w.level === 'cet6'; });
      CILIN.store.state.settings.vocabScope = old;
      return { pool: pool.length, allSix, freshSix, fresh: plan.fresh.length }; })()`);
    check("scope.cet6", scope && scope.pool >= 1000 && scope.allSix && scope.freshSix, JSON.stringify(scope));

    const loop = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u5b'); await s(700);
      const token = document.querySelector('[data-rdw="intelligence"]');
      if (!token) return { miss: true };
      token.click(); await s(400);
      const add = document.querySelector('#overlay [data-today]');
      if (!add) return { miss: 'no-add' };
      add.click(); await s(400);
      const queued = CILIN.store.queueWords().map(function (w) { return w.w; });
      const inPlan = CILIN.store.plan().queue.some(function (w) { return w.w === 'intelligence'; });
      CILIN.go('/today'); await s(600);
      const todayText = document.querySelector('#app').innerText;
      const hasExtra = todayText.indexOf('今日加练') >= 0;
      CILIN.store.clearTodayQueue();
      return { queued, inPlan, hasExtra }; })()`);
    check("loop.reading.today", loop && !loop.miss && loop.queued.indexOf('intelligence') >= 0 && loop.inPlan && loop.hasExtra, JSON.stringify(loop));
    await shot("today-extra");

    const batch = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/read/u1a'); await s(700);
      const tokens = Array.from(document.querySelectorAll('.rd-token[data-rdw]')).slice(0, 3);
      tokens.forEach(function (t) { t.click(); });
      await s(500);
      const btn = document.querySelector('#addClicked');
      if (!btn) return { miss: true };
      btn.click(); await s(400);
      const queued = CILIN.store.queueWords().map(function (w) { return w.w; });
      CILIN.store.clearTodayQueue();
      return { clicked: tokens.length, queued: queued.length, btn: btn.innerText.slice(0, 40) }; })()`);
    check("loop.reading.batch", batch && batch.clicked >= 2 && batch.queued >= 2, JSON.stringify(batch));

    await evalJs("CILIN.go('/today'); 1"); await sleep(500);

    // 1. 闪卡
    await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      document.querySelector('[data-start]').click(); await s(300);
      for(let i=0;i<12;i++){ const rev=document.querySelector('[data-reveal]'); if(!rev) break;
        if(!document.querySelector('#fc.revealed')) rev.click(); await s(90);
        const q=document.querySelector('[data-q="2"]'); if(!q) break; q.click(); await s(120); }
      return document.querySelector('#overlay').innerText.slice(0,80); })()`);
    await sleep(300);
    const flash = await evalJs("({ words: Object.keys(CILIN.store.state.words).length, xp: CILIN.store.state.profile.xp, overlay: document.querySelector('#overlay').innerText.slice(0,60) })");
    check("flashcard.complete", flash.words >= 10 && flash.xp > 0, JSON.stringify(flash));
    await shot("flash-summary");
    await evalJs("document.querySelector('#overlay [data-close]').click(); 1");
    await sleep(400);

    // 中途卡片画面
    await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      document.querySelector('[data-start]').click(); await s(300);
      document.querySelector('[data-reveal]').click(); await s(200); return 1; })()`);
    await shot("flash-card");
    // 中途评分后从右上角关闭，验证页面会刷新
    await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const q=document.querySelector('[data-q="2"]'); if(q) q.click(); await s(300); return 1; })()`);
    await evalJs("(function(){const b=document.querySelector('#overlay .session-top [data-close]'); if(b) b.click(); return 0;})()");
    await sleep(500);
    const flashClosed = await evalJs("({hidden: document.getElementById('overlay').classList.contains('hidden'), hero: !!document.querySelector('[data-start]')})");
    check("flashcard.close", flashClosed.hidden && flashClosed.hero, JSON.stringify(flashClosed));

    // 2. 词汇速测
    const quiz = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.session.quiz(CILIN.quiz.make({count:4,seed:11}),{title:'QA 词汇速测',kind:'vocab',kindLabel:'词汇速测'});
      await s(300);
      for(let i=0;i<10;i++){
        const input=document.querySelector('#spellInput');
        if(input){ input.value='test'; const b=document.querySelector('#checkBtn'); if(!b) break; b.click(); await s(200); b.click(); await s(220); continue; }
        const opt=document.querySelector('.opt:not([disabled])'); if(!opt) break; opt.click(); await s(180);
        const next=document.querySelector('#nextBtn'); if(next) next.click(); await s(220);
      }
      return document.querySelector('#overlay').innerText.slice(0,160); })()`);
    check("quiz.flow", /答对|完成|水很清|仍在路上|再走一遍/.test(quiz || ""), quiz);
    await shot("quiz-summary");
    await evalJs("(function(){const b=document.querySelector('#overlay [data-close]'); if(b){b.click();return 1;} const ov=document.querySelector('#overlay'); if(ov){ov.classList.add('hidden');} return 0;})()");
    await sleep(300);

    // 3. 阅读
    const reading = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const set=CILIN.questions.reading[0];
      CILIN.views.train._start.reading(set); await s(350);
      set.items.forEach((it,qi)=>{ const opts=document.querySelectorAll('.opt[data-q="'+qi+'"]'); if(opts[it.answer]) opts[it.answer].click(); });
      await s(200); document.querySelector('[data-submit]').click(); await s(900);
      return document.querySelector('#overlay').innerText.slice(0,160); })()`);
    check("reading.flow", /答对/.test(reading || ""), reading);
    await shot("reading-score");
    await evalJs("const b=document.querySelector('#overlay [data-back]'); if(b) b.click(); 1");
    await sleep(300);

    // 4. 选词填空
    const cloze = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const set=CILIN.questions.cloze[0];
      CILIN.views.train._start.cloze(set); await s(350);
      Object.keys(set.answers).forEach(n=>{
        const b=document.querySelector('.blank[data-blank="'+n+'"]'); if(b) b.click();
        const o=document.querySelector('[data-opt="'+set.answers[n]+'"]'); if(o) o.click();
      });
      await s(200); document.querySelector('[data-submit]').click(); await s(600);
      return document.querySelector('#overlay').innerText.slice(0,160); })()`);
    check("cloze.flow", /答对|水很清|仍在路上|再走一遍/.test(cloze || ""), cloze);
    await shot("cloze-score");
    await evalJs("(function(){const b=document.querySelector('#overlay [data-back]'); if(b) b.click(); return 0;})()");
    await sleep(300);

    // 5. 匹配
    const matching = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const set=CILIN.questions.matching[0];
      CILIN.views.train._start.matching(set); await s(350);
      set.items.forEach((it,i)=>{ const sel=document.querySelector('select[data-i="'+i+'"]'); if(sel){ sel.value=it.answer; sel.dispatchEvent(new Event('change')); } });
      await s(200); document.querySelector('[data-submit]').click(); await s(600);
      return document.querySelector('#overlay').innerText.slice(0,160); })()`);
    check("matching.flow", /答对|水很清|仍在路上|再走一遍/.test(matching || ""), matching);
    await evalJs("(function(){const b=document.querySelector('#overlay [data-back]'); if(b) b.click(); return 0;})()");
    await sleep(300);

    // 6. 翻译
    const trans = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.views.train._start.translation(CILIN.questions.translation[0]); await s(350);
      const ta=document.querySelector('#transInput'); ta.value='In recent years, China has developed rapidly in many fields, and the government has taken effective measures to improve people\\'s lives.';
      document.querySelector('[data-reveal]').click(); await s(150);
      document.querySelector('[data-done]').click(); await s(500);
      return document.querySelector('#overlay').innerText.slice(0,100); })()`);
    check("translation.flow", /答对|完成|汉译英/.test(trans || ""), trans);
    await evalJs("(function(){const b=document.querySelector('#overlay [data-back]'); if(b) b.click(); return 0;})()");
    await sleep(300);

    // 7. 写作
    const writing = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.views.train._start.writing(CILIN.questions.writing[0]); await s(350);
      const ta=document.querySelector('#writeInput');
      ta.value=Array(90).fill('word').join(' ');
      ta.dispatchEvent(new Event('input'));
      document.querySelector('[data-done]').click(); await s(500);
      return document.querySelector('#overlay').innerText.slice(0,100); })()`);
    check("writing.flow", /写作|完成/.test(writing || ""), writing);
    await evalJs("(function(){const b=document.querySelector('#overlay [data-back]'); if(b) b.click(); return 0;})()");
    await sleep(300);

    // 8. 听力
    const listening = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const set=CILIN.questions.listening[0];
      CILIN.views.train._start.listening(set); await s(350);
      set.questions.forEach((q,qi)=>{ const opts=document.querySelectorAll('.opt[data-q="'+qi+'"]'); if(opts[q.answer]) opts[q.answer].click(); });
      await s(200); document.querySelector('[data-submit]').click(); await s(400);
      const t=document.querySelector('#transcript');
      return { text: document.querySelector('#overlay').innerText.slice(0,80), transcript: t ? t.style.display : 'missing' }; })()`);
    check("listening.flow", listening && listening.transcript === "block", JSON.stringify(listening));
    await sleep(500);
    await evalJs("(function(){const b=document.querySelector('#overlay [data-back]'); if(b){b.click();return 1;} const c=document.querySelector('#overlay [data-close]'); if(c){c.click();return 1;} const ov=document.querySelector('#overlay'); if(ov){ov.classList.add('hidden');} return 0;})()");
    await sleep(400);

    // 8b. 新题型：三选一 / 15词匹配 / 课本原题 / 翻译 / paraphrase
    const trainNew = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const close=async()=>{ const b=document.querySelector('#overlay [data-close]'); if(b) b.click(); await s(250); };
      CILIN.go('/train'); await s(700);
      const cardClick=async(k)=>{ const c=document.querySelector('[data-train="'+k+'"]'); if(!c) return false; c.click(); await s(450); return true; };
      const results={};
      await cardClick('cloze3');
      results.cloze3={ blocks: document.querySelectorAll('#overlay .q-block').length, opts: document.querySelectorAll('#overlay .opt').length, visible: !document.getElementById('overlay').classList.contains('hidden') };
      await close();
      await cardClick('match15'); const picks=document.querySelectorAll('#overlay [data-pick]'); results.match15Picks=picks.length; if(picks[0]) picks[0].click(); await s(450);
      results.match15={ selects: document.querySelectorAll('#overlay .match-select').length, words: document.querySelectorAll('#overlay .syn-chip').length };
      await close();
      await cardClick('textbook'); const tbPicks=document.querySelectorAll('#overlay [data-pick]'); results.textbookPicks=tbPicks.length; if(tbPicks[0]) tbPicks[0].click(); await s(450);
      results.textbook={ opts: document.querySelectorAll('#overlay .opt').length, text: document.querySelector('#overlay').innerText.slice(0,60) };
      await close();
      await cardClick('paraphrase_u14a'); const ppPicks=document.querySelectorAll('#overlay [data-pick]'); if(ppPicks[0]) ppPicks[0].click(); await s(450);
      results.paraphrase={ input: !!document.querySelector('#ppInput') };
      await close();
      await cardClick('translation_u14a'); const trPicks=document.querySelectorAll('#overlay [data-pick]'); if(trPicks[0]) trPicks[0].click(); await s(450);
      results.translation={ input: !!document.querySelector('#transInput') };
      await close();
      return results; })()`);
    check("train.newtypes", trainNew && trainNew.cloze3.blocks >= 10 && trainNew.cloze3.opts >= 30 && trainNew.match15Picks >= 4 && trainNew.match15.selects === 15 && trainNew.textbookPicks >= 6 && trainNew.textbook.opts >= 15 && trainNew.paraphrase.input && trainNew.translation.input, JSON.stringify(trainNew));

    // 9. 影子
    const shadow = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      const w=CILIN.coreWords.slice(0,3);
      w.forEach(x=>CILIN.store.addShadow(x.w,'QA 测试'));
      CILIN.go('/shadow'); await s(400);
      const rows=document.querySelectorAll('.shadow-row').length;
      document.querySelector('.shadow-row').click(); await s(350);
      const sheet=!!document.querySelector('.sheet');
      document.querySelector('[data-seen]').click(); await s(400);
      return { rows: rows, sheet: sheet, integrated: CILIN.store.state.stats.integrated }; })()`);
    check("shadow.integrate", shadow && shadow.rows >= 3 && shadow.sheet && shadow.integrated >= 1, JSON.stringify(shadow));
    await shot("shadow-page");

    // 10. 词林搜索 + 词卡
    const grove = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/grove'); await s(700);
      const inp=document.querySelector('#groveSearch');
      if(!inp) return { rows:0, sheetText:'', hash: location.hash, missing:true };
      inp.value='abandon'; inp.dispatchEvent(new Event('input')); await s(600);
      const rows=document.querySelectorAll('.word-row').length;
      const first=document.querySelector('.word-row'); if(first) first.click(); await s(400);
      const sheetText=document.querySelector('.sheet') ? document.querySelector('.sheet').innerText.slice(0,100) : '';
      const synChips=document.querySelectorAll('.sheet .syn-chip').length;
      return { rows: rows, sheetText: sheetText, synChips: synChips, hash: location.hash }; })()`);
    check("grove.search", grove && !grove.missing && grove.rows >= 1 && /abandon/.test(grove.sheetText) && grove.synChips >= 1, JSON.stringify(grove));
    await shot("word-sheet");
    await evalJs("(function(){const b=document.querySelector('#overlay [data-close]'); if(b) b.click(); return 0;})()");
    await sleep(300);

    // 11. 旅程 + 明暗主题
    const journey = await evalJs(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
      CILIN.go('/journey'); await s(700);
      return { level: !!document.querySelector('.level-card'), heat: !!document.querySelector('.heat'), badges: document.querySelectorAll('.badge').length }; })()`);
    check("journey.render", journey && journey.level && journey.heat && journey.badges === 18, JSON.stringify(journey));
    const themeClicked = await evalJs("(function(){const b=document.querySelector('#themeSwitch'); if(!b) return false; b.click(); return true;})()"); await sleep(500);
    const theme = await evalJs("document.documentElement.getAttribute('data-theme')");
    check("theme.toggle", themeClicked && theme === "light", theme);
    await shot("journey-light");
    await evalJs("(function(){const b=document.querySelector('#themeSwitch'); if(b) b.click(); return 0;})()"); await sleep(300);

    // 12. 有数据状态下的页面（演示/验收截图）
    await evalJs("CILIN.go('/today'); 1"); await sleep(600); await shot("filled-today");
    await evalJs("CILIN.go('/grove'); 1"); await sleep(600); await shot("filled-grove");
    await evalJs("CILIN.go('/journey'); 1"); await sleep(600); await shot("filled-journey");

    // 13. 持久化
    const before = await evalJs("({xp: CILIN.store.state.profile.xp, words: Object.keys(CILIN.store.state.words).length})");
    await cdp.send("Page.reload", { ignoreCache: false });
    await sleep(2500);
    const after = await evalJs("window.CILIN ? ({xp: CILIN.store.state.profile.xp, words: Object.keys(CILIN.store.state.words).length}) : null");
    check("persist.reload", after && after.words === before.words && after.xp === before.xp, JSON.stringify({ before, after }));

    // 13. 移动端
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await evalJs("CILIN.go('/today'); 1"); await sleep(700);
    await shot("mobile-today");
    await evalJs("CILIN.go('/read/u1a'); 1"); await sleep(700);
    await shot("mobile-read");
    await cdp.send("Emulation.clearDeviceMetricsOverride");

    // 收尾
    const jsErrors = await evalJs("CILIN.errors || []");
    check("js.errors", (!jsErrors || jsErrors.length === 0), (jsErrors || []).join(" | "));
  } catch (e) {
    failSoft("qa.crash", e);
  }

  const report = {
    time: new Date().toISOString(),
    pass: results.filter((r) => r.ok).length,
    total: results.length,
    results,
    pageErrors: errors,
    screenshots: fs.readdirSync(SHOTS).filter((f) => f.startsWith("qa-"))
  };
  fs.writeFileSync(path.join(ROOT, "build", "qa-report.json"), JSON.stringify(report, null, 2));
  console.log("\n==== QA " + report.pass + "/" + report.total + " ====");
  if (errors.length) console.log("console/exception errors:\n" + errors.slice(0, 20).join("\n"));
  process.exit(report.pass === report.total && errors.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
