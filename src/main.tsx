import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, Search, Trash2, TriangleAlert, FileImage, LockKeyhole, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import './styles.css';

type Account = { name: string; category: string; status: 'found' | 'queued' | 'deleted'; risk: 'low' | 'medium' | 'high' };

const initialAccounts: Account[] = [
  { name: 'VK', category: 'Социальная сеть', status: 'found', risk: 'medium' },
  { name: 'Dropbox', category: 'Облачное хранилище', status: 'found', risk: 'high' },
  { name: 'Pinterest', category: 'Контент', status: 'queued', risk: 'low' },
  { name: 'Old Forum', category: 'Форум', status: 'deleted', risk: 'high' }
];

function App() {
  const [scan, setScan] = useState(false);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [tab, setTab] = useState<'overview'|'accounts'|'files'|'plans'>('overview');
  const score = useMemo(() => 72 - accounts.filter(a => a.status === 'deleted').length * 6, [accounts]);

  const queueDelete = (name: string) => setAccounts(v => v.map(a => a.name === name ? {...a, status: 'queued'} : a));

  return <div className="app">
    <header><div className="brand"><div className="logo"><ShieldCheck size={22}/></div><div><b>TraceZero</b><span>Digital privacy center</span></div></div><button className="iconBtn"><LockKeyhole size={18}/></button></header>

    <main>
      {tab === 'overview' && <>
        <section className="hero glass">
          <div><span className="eyebrow"><Sparkles size={14}/> ОБЩИЙ РИСК</span><h1>{score}<small>/100</small></h1><p>Найдено 12 следов, требующих внимания. Интернет всё помнит. Какая трогательная преданность.</p></div>
          <div className="ring" style={{'--p': `${score}%`} as React.CSSProperties}><span>{score}</span></div>
        </section>

        <button className="primary" onClick={() => { setScan(true); setTimeout(() => setScan(false), 1800); }}>
          <Search size={19}/>{scan ? 'Сканируем открытые источники…' : 'Начать новое сканирование'}
        </button>

        <section className="stats">
          <article className="glass"><TriangleAlert/><b>3</b><span>утечки данных</span></article>
          <article className="glass"><Search/><b>8</b><span>найденных аккаунтов</span></article>
          <article className="glass"><Trash2/><b>4</b><span>запроса на удаление</span></article>
        </section>

        <section><div className="sectionTitle"><h2>Приоритетные действия</h2><button onClick={() => setTab('accounts')}>Все <ChevronRight size={16}/></button></div>
          <div className="list glass">
            {accounts.filter(a=>a.status!=='deleted').slice(0,3).map(a=><div className="row" key={a.name}><div className={`risk ${a.risk}`}></div><div className="grow"><b>{a.name}</b><span>{a.category}</span></div><button onClick={()=>queueDelete(a.name)}>{a.status==='queued'?'В очереди':'Удалить'}</button></div>)}
          </div>
        </section>
      </>}

      {tab === 'accounts' && <section><div className="sectionTitle"><div><span className="eyebrow">МОИ ДАННЫЕ</span><h2>Найденные аккаунты</h2></div></div><div className="list glass">{accounts.map(a=><div className="row" key={a.name}><div className={`risk ${a.risk}`}></div><div className="grow"><b>{a.name}</b><span>{a.category} · {a.risk==='high'?'высокий риск':a.risk==='medium'?'средний риск':'низкий риск'}</span></div>{a.status==='deleted'?<CheckCircle2 className="ok"/>:<button onClick={()=>queueDelete(a.name)}>{a.status==='queued'?'Запрос создан':'Удалить'}</button>}</div>)}</div></section>}

      {tab === 'files' && <section><span className="eyebrow">ЛОКАЛЬНАЯ ОБРАБОТКА</span><h2>Очистка метаданных</h2><div className="drop glass"><FileImage size={38}/><b>Загрузите фото или документ</b><p>В релизе файл будет очищаться на устройстве: GPS, EXIF, модель камеры, автор и история редактирования.</p><label>Выбрать файл<input type="file" hidden/></label></div></section>}

      {tab === 'plans' && <section><span className="eyebrow">ПОДПИСКА</span><h2>Тарифы</h2><div className="plans"><article className="glass"><b>Free</b><h3>0 ₽</h3><p>1 email, 2 ника, базовая проверка</p><button>Текущий</button></article><article className="glass featured"><span>ВЫГОДНО</span><b>Protect</b><h3>599 ₽<small>/мес</small></h3><p>Полное сканирование, утечки, запросы удаления, мониторинг</p><button>Подключить</button></article><article className="glass"><b>Concierge</b><h3>2490 ₽</h3><p>Ручное сопровождение удаления специалистом</p><button>Выбрать</button></article></div></section>}
    </main>

    <nav>{[
      ['overview','Обзор',ShieldCheck],['accounts','Аккаунты',Search],['files','Файлы',FileImage],['plans','Тарифы',Sparkles]
    ].map(([id,label,Icon])=><button key={id as string} className={tab===id?'active':''} onClick={()=>setTab(id as typeof tab)}><Icon size={20}/><span>{label as string}</span></button>)}</nav>
  </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
