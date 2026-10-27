/* 我家漫遊：離線版本（2026-10-27.22 使用者：「這有沒有離線模式？就是網頁整個存到手機裡面這樣」）
   第一次有網路打開時，把遊戲（index.html、3D 引擎 three.js、死亡騎士模型、圖示）存到手機瀏覽器的「網站資料」（Cache Storage：home-app-v1），之後沒網路也能打開。
   - 網頁本身（index.html）：先上網抓最新的（4 秒抓不到才用手機裡的），抓到就順便更新手機裡那份 → 有網路時一定是新版。
   - three.js（固定 0.170.0 版，不會變）：先用手機裡的，沒有才上網抓。
   - 其他自己網站的檔案（模型、圖示）：先用手機裡的，同時在背景上網更新。
   - 不管的：樂器音色 gm/（遊戲自己存在 home-gm-v1）、檢查新版本（網址有 ?_=，一定上網）、連線用的 PeerJS（離線本來就不能連線）。
   改了這個檔案（例如要多存新的檔案），瀏覽器會自己重裝；要整個重存就把 C 的 v1 改成 v2（舊的會刪掉）。 */
const C='home-app-v1';
const T3='https://cdn.jsdelivr.net/npm/three@0.170.0/';
const CORE=['./','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./models/dk.glb',
  T3+'build/three.module.js',T3+'examples/jsm/objects/Sky.js',T3+'examples/jsm/controls/OrbitControls.js',T3+'examples/jsm/objects/Reflector.js',
  T3+'examples/jsm/utils/BufferGeometryUtils.js',T3+'examples/jsm/loaders/GLTFLoader.js',T3+'examples/jsm/loaders/DRACOLoader.js',
  T3+'examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js',T3+'examples/jsm/libs/draco/gltf/draco_decoder.wasm'];
const scope=()=>self.registration.scope,IV={ignoreVary:true};
const keyOf=u=>{const x=new URL(u,scope());if(x.origin===location.origin){x.search='';if(x.href===scope()+'index.html')return scope();}return x.href;};   /* 自己網站的檔案不管 ?v= 都存同一份；index.html＝首頁 */
const warm=()=>caches.open(C).then(c=>Promise.all(CORE.map(u=>fetch(new URL(u,scope()).href,{cache:'no-cache'}).then(r=>{if(r.ok)return c.put(keyOf(u),r);}).catch(()=>{}))));   /* 把要存的全部抓一次 */
self.addEventListener('install',e=>{e.waitUntil(warm().then(()=>self.skipWaiting()));});
self.addEventListener('message',e=>{if(e.data==='warm')e.waitUntil(warm());});   /* 遊戲發現沒存齊（例如按了「只清離線資料」）：再存一次 */
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('home-app-')&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const put=(k,r)=>{if(r&&r.ok&&(r.type==='basic'||r.type==='cors'))caches.open(C).then(c=>c.put(k,r)).catch(()=>{});};
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const u=new URL(q.url);
  if(u.origin===location.origin){
    if(!u.href.startsWith(scope()))return;
    if(u.pathname.includes('/gm/')||u.searchParams.has('_'))return;   /* 音色、檢查新版本：不管 */
    const bare=u.href.split('?')[0],page=bare===scope()||bare===scope()+'index.html';if(!page&&q.mode==='navigate')return;   /* 只有遊戲首頁算「網頁」；打開資料夾裡別的頁面不管（不然會被存成遊戲） */
    if(page){e.respondWith((async()=>{const k=scope();
      try{const r=await Promise.race([fetch(q),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),4000))]);if(r.ok){put(k,r.clone());return r;}const hit=await caches.match(k,IV);return hit||r;}
      catch(_){const hit=await caches.match(k,IV);if(hit)return hit;return new Response('<meta charset="utf-8"><h3 style="font-family:sans-serif">📴 沒有網路，手機裡也還沒存好離線版本：有網路的時候打開一次就會存好</h3>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8'}});}})());return;}   /* 網頁：先上網（4 秒），沒有才用手機裡的 */
    const k=keyOf(q.url);e.respondWith(caches.match(k,IV).then(hit=>{const net=fetch(q).then(r=>{put(k,r.clone());return r;});if(hit){net.catch(()=>{});return hit;}return net;}));return;}   /* 模型、圖示：先用手機裡的，背景更新 */
  if(u.href.startsWith(T3)){e.respondWith(caches.match(u.href,IV).then(hit=>hit||fetch(q).then(r=>{put(u.href,r.clone());return r;})));}   /* three.js：版本固定，存了就一直用 */
});
