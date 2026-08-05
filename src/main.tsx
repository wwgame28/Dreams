import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ShieldCheck, Search, FileImage, ExternalLink,
  CheckCircle2, ChevronRight, Sparkles, UserCheck, CircleHelp, Download,
  LoaderCircle, ListChecks, Settings2
} from 'lucide-react';
import './styles.css';

type Status = 'found' | 'not_found' | 'unknown';
type ScanResult = { service:string; category:string; profile_url:string; delete_url:string; status:Status; http_status?:number };
type Task = ScanResult & { taskStatus:'new'|'queued'|'done' };
type Tab = 'overview'|'accounts'|'files'|'settings';

const STORE_KEY = 'tracezero-state-v1';

function loadState(): {username:string; results:Task[]} {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '') } catch { return { username:'', results:[] } }
}

function App() {
  const saved = loadState();
  const [tab, setTab] = useState<Tab>('overview');
  const [username, setUsername] = useState(saved.username);
  const [results, setResults] = useState<Task[]>(saved.results);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => localStorage.setItem(STORE_KEY, JSON.stringify({ username, results })), [username, results]);

  const found = results.filter(r => r.status === 'found');
  const queued = results.filter(r => r.taskStatus === 'queued').length;
  const done = results.filter(r => r.taskStatus === 'done').length;
  const unknown = results.filter(r => r.status === 'unknown').length;
  const score = useMemo(() => Math.max(5, Math.min(95, 18 + found.length * 8 + unknown * 2 - done * 5)), [found.length, unknown, done]);

  async function runScan() {
    const clean = username.trim();
    if (clean.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(clean)) {
      setMessage('Введите ник латиницей: буквы, цифры, точка, дефис или подчёркивание.'); return;
    }
    setLoading(true); setMessage('');
    try {
      const response = await fetch(`/api/scan?username=${encodeURIComponent(clean)}`);
      if (!response.ok) throw new Error('scan failed');
      const data: ScanResult[] = await response.json();
      setResults(data.map(item => ({...item, taskStatus:'new'})));
      setTab('accounts');
    } catch {
      setMessage('Сканирование не запустилось. Проверьте соединение и повторите.');
    } finally { setLoading(false); }
  }

  function setTask(service:string, taskStatus:Task['taskStatus']) {
    setResults(items => items.map(item => item.service === service ? {...item, taskStatus} : item));
  }

  async function cleanImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Пока поддерживаются изображения JPG, PNG и WebP.'); return; }
    setCleaning(true); setMessage('');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(bitmap, 0, 0);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.94));
      if (!blob) throw new Error('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = file.name.replace(/\.[^.]+$/, '');
      a.href = url; a.download = `${base}-clean.${mime === 'image/png' ? 'png' : 'jpg'}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage('Готово. Изображение пересобрано без исходных EXIF и GPS-метаданных.');
    } catch { setMessage('Не удалось обработать файл на этом устройстве.'); }
    finally { setCleaning(false); }
  }

  return <div className="app">
    <header><div className="brand"><div className="logo"><ShieldCheck size={22}/></div><div><b>TraceZero</b><span>Центр цифровой приватности</span></div></div><div className="localBadge">Локально</div></header>
    <main>
      {message && <div className="notice">{message}</div>}
      {tab === 'overview' && <>
        <section className="hero glass"><div><span className="eyebrow"><Sparkles size={14}/> ТЕКУЩИЙ РИСК</span><h1>{results.length ? score : '—'}<small>/100</small></h1><p>{results.length ? `Проверено ${results.length} сервисов. Найдено вероятных профилей: ${found.length}.` : 'Добавьте свой ник и проверьте открытые профили. Только свои данные.'}</p></div><div className="ring" style={{'--p': `${results.length ? score : 0}%`} as React.CSSProperties}><span>{results.length ? score : '?'}</span></div></section>
        <section className="scanBox glass"><label>Ваш публичный ник</label><div><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="например, danil_28" autoCapitalize="none"/><button onClick={runScan} disabled={loading}>{loading ? <LoaderCircle className="spin"/> : <Search/>}</button></div><small>Проверка выполняется по общедоступным страницам. Результаты требуют ручного подтверждения.</small></section>
        <section className="stats"><article className="glass"><UserCheck/><b>{found.length}</b><span>вероятных профилей</span></article><article className="glass"><CircleHelp/><b>{unknown}</b><span>нужно проверить</span></article><article className="glass"><ListChecks/><b>{queued}</b><span>в очереди</span></article></section>
        <section><div className="sectionTitle"><h2>Следующие действия</h2><button onClick={()=>setTab('accounts')}>Все <ChevronRight size={16}/></button></div><div className="list glass">{found.slice(0,4).map(item=><AccountRow key={item.service} item={item} setTask={setTask}/>)}{!found.length && <div className="empty">После проверки здесь появятся найденные профили и ссылки на удаление.</div>}</div></section>
      </>}
      {tab === 'accounts' && <section><span className="eyebrow">РЕЗУЛЬТАТЫ ПРОВЕРКИ</span><h2>Публичные профили</h2>{!results.length ? <div className="emptyCard glass">Сначала запустите проверку на главном экране.</div> : <><div className="filters"><span>Найдено: {found.length}</span><span>Не найдено: {results.filter(r=>r.status==='not_found').length}</span><span>Неясно: {unknown}</span></div><div className="list glass">{results.map(item=><AccountRow key={item.service} item={item} setTask={setTask}/>)}</div></>}</section>}
      {tab === 'files' && <section><span className="eyebrow">ОБРАБОТКА НА УСТРОЙСТВЕ</span><h2>Очистка метаданных</h2><div className="drop glass"><FileImage size={42}/><b>Удалить EXIF и GPS</b><p>Фото пересобирается прямо в браузере и не отправляется на сервер. Поддерживаются JPG, PNG и WebP.</p><label>{cleaning ? <><LoaderCircle className="spin"/> Обработка…</> : <><Download size={18}/> Выбрать фото</>}<input type="file" accept="image/*" hidden onChange={cleanImage} disabled={cleaning}/></label></div><div className="privacyNote"><ShieldCheck/> Исходный файл остаётся на вашем устройстве.</div></section>}
      {tab === 'settings' && <section><span className="eyebrow">НАСТРОЙКИ</span><h2>Данные приложения</h2><div className="settingsCard glass"><b>Локальное сохранение</b><p>Ник, результаты и очередь задач хранятся только в браузере этого устройства.</p><button className="danger" onClick={()=>{localStorage.removeItem(STORE_KEY);setUsername('');setResults([]);setMessage('Локальные данные удалены.');}}>Очистить мои данные</button></div><div className="settingsCard glass"><b>Что пока не подключено</b><p>Проверка email по базам утечек и анализ почты требуют отдельных API и безопасной авторизации.</p></div></section>}
    </main>
    <nav>{[['overview','Обзор',ShieldCheck],['accounts','Аккаунты',Search],['files','Файлы',FileImage],['settings','Настройки',Settings2]].map(([id,label,Icon])=><button key={id as string} className={tab===id?'active':''} onClick={()=>setTab(id as Tab)}><Icon size={20}/><span>{label as string}</span></button>)}</nav>
  </div>
}

function AccountRow({item,setTask}:{item:Task;setTask:(service:string,status:Task['taskStatus'])=>void}) {
  const label = item.status === 'found' ? 'Найден' : item.status === 'not_found' ? 'Не найден' : 'Проверить';
  return <div className="row"><div className={`statusDot ${item.status}`}></div><div className="grow"><b>{item.service}</b><span>{item.category} · {label}</span></div><a href={item.profile_url} target="_blank" rel="noreferrer" aria-label="Открыть профиль"><ExternalLink size={17}/></a>{item.status !== 'not_found' && (item.taskStatus === 'done' ? <CheckCircle2 className="ok"/> : <button onClick={()=> item.taskStatus === 'queued' ? setTask(item.service,'done') : setTask(item.service,'queued')}>{item.taskStatus === 'queued' ? 'Готово' : 'Удалить'}</button>)}{item.taskStatus === 'queued' && <a className="deleteLink" href={item.delete_url} target="_blank" rel="noreferrer">Инструкция</a>}</div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);