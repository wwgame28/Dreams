import asyncio, re
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
import httpx

app=FastAPI(title='TraceZero',version='3.0.0')
SERVICES=[('GitHub','https://github.com/{u}','https://github.com/settings/admin'),('Telegram','https://t.me/{u}','https://my.telegram.org/auth?to=delete'),('Instagram','https://www.instagram.com/{u}/','https://accountscenter.instagram.com/personal_info/account_ownership_and_control/deactivation_or_deletion/'),('VK','https://vk.com/{u}','https://vk.com/settings?act=deactivate'),('Reddit','https://www.reddit.com/user/{u}/','https://www.reddit.com/settings/account'),('Pinterest','https://www.pinterest.com/{u}/','https://www.pinterest.com/settings/privacy-and-data/'),('Steam','https://steamcommunity.com/id/{u}','https://help.steampowered.com/en/wizard/HelpDeleteAccount')]

PAGE='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TraceZero v3</title><style>body{margin:0;background:#06100c;color:#eef8f2;font-family:system-ui}main{max-width:620px;margin:auto;padding:22px}.card{background:#0d1a14;border:1px solid #ffffff18;border-radius:24px;padding:20px;margin:14px 0}.brand{font-size:28px;font-weight:800}.muted{color:#91a69a}.row{display:flex;gap:10px;align-items:center;padding:14px 0;border-bottom:1px solid #ffffff12}.row:last-child{border:0}.grow{flex:1}input,button{font:inherit;border-radius:14px;padding:14px}input{width:100%;box-sizing:border-box;background:#08130f;border:1px solid #ffffff18;color:white}button{border:0;background:#28e88d;color:#042d1b;font-weight:800}.danger{background:#ff6575;color:white}.pill{font-size:12px;color:#62e8a9}.actions{display:flex;gap:10px;flex-wrap:wrap}a{color:#62e8a9}</style></head><body><main><div class="brand">TraceZero v3</div><p class="muted">Самоаудит цифрового следа. Только свои данные.</p><section class="card"><h2>Мои идентификаторы</h2><input id="nick" placeholder="Ваш ник, например danil_28" autocomplete="off"><p class="muted">Поиск выполняется только по введённому вами нику. Телефон и госномер не используются для поиска людей.</p><button onclick="scan()">Найти мои профили</button></section><section class="card"><div class="actions"><button onclick="queueAll()">Удалить всё найденное</button><button class="danger" onclick="clearAll()">Очистить данные</button></div><div id="status" class="muted"></div><div id="results"></div></section><section class="card"><h2>Очистка фото</h2><input id="file" type="file" accept="image/*"><button onclick="cleanImage()">Удалить EXIF и GPS</button><p id="fileStatus" class="muted"></p></section></main><script>let items=JSON.parse(localStorage.getItem('tz3')||'[]');render();async function scan(){const u=document.getElementById('nick').value.trim();if(!/^[A-Za-z0-9_.-]{2,40}$/.test(u)){status.textContent='Введите корректный ник латиницей';return}status.textContent='Проверяем открытые страницы…';const r=await fetch('/api/scan?username='+encodeURIComponent(u));items=await r.json();localStorage.setItem('tz3',JSON.stringify(items));status.textContent='Готово';render()}function render(){results.innerHTML=items.map((x,i)=>`<div class="row"><div class="grow"><b>${x.service}</b><div class="pill">${x.status==='found'?'Найден':'Проверить вручную'}</div></div><a target="_blank" href="${x.profile_url}">Профиль</a><a target="_blank" href="${x.delete_url}">Удаление</a><input type="checkbox" ${x.queued?'checked':''} onchange="toggle(${i},this.checked)"></div>`).join('')}function toggle(i,v){items[i].queued=v;localStorage.setItem('tz3',JSON.stringify(items))}function queueAll(){items=items.map(x=>({...x,queued:true}));localStorage.setItem('tz3',JSON.stringify(items));render()}function clearAll(){localStorage.removeItem('tz3');items=[];render()}async function cleanImage(){const f=file.files[0];if(!f)return;const b=await createImageBitmap(f);const c=document.createElement('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b,0,0);c.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clean-'+f.name.replace(/\.[^.]+$/,'.jpg');a.click();fileStatus.textContent='Готово: создан файл без исходных EXIF/GPS'},'image/jpeg',.94)}</script></body></html>'''

@app.get('/',response_class=HTMLResponse)
def root(): return HTMLResponse(PAGE,headers={'Cache-Control':'no-store'})

@app.get('/api/health')
def health(): return {'ok':True,'version':'3.0.0'}

async def check(client,s,u):
    name,tpl,delete=s; url=tpl.format(u=u)
    try:
        r=await client.get(url,follow_redirects=True)
        text=r.text[:4000].lower()
        missing=any(x in text for x in ['not found','page not found','user not found','doesn’t exist','does not exist'])
        status='found' if 200<=r.status_code<400 and not missing else 'unknown'
    except Exception: status='unknown'
    return {'service':name,'profile_url':url,'delete_url':delete,'status':status,'queued':False}

@app.get('/api/scan')
async def scan(username:str=Query(min_length=2,max_length=40)):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+',username): return []
    async with httpx.AsyncClient(timeout=7,headers={'User-Agent':'TraceZero self-audit'}) as client:
        return await asyncio.gather(*(check(client,s,username) for s in SERVICES))
