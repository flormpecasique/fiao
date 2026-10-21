(function(){
"use strict";
const KEY="fiao.v1";
const DAY=86400000, LATE_DAYS=15;
const wideMQ=window.matchMedia?matchMedia("(min-width:1000px)"):{matches:false,addEventListener(){}};

/* ---------- datos ---------- */
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}
function seed(){
  const now=Date.now(), t=36.5;
  const c=[
    {id:"e1",nombre:"Señora Carmen",tel:"04141234567",nota:"Casa azul, esquina",ejemplo:true,creado:now-40*DAY},
    {id:"e2",nombre:"José el mototaxista",tel:"04249876543",nota:"",ejemplo:true,creado:now-20*DAY},
    {id:"e3",nombre:"Yuleisy",tel:"04125551122",nota:"Paga los viernes",ejemplo:true,creado:now-9*DAY},
    {id:"e4",nombre:"Don Ramón",tel:"",nota:"",ejemplo:true,creado:now-30*DAY}
  ];
  const m=(cid,tipo,usd,daysAgo,nota,moneda)=>({id:uid(),cid,tipo,usd,moneda:moneda||"USD",orig:moneda==="VES"?Math.round(usd*t*100)/100:usd,tasa:t,nota,fecha:now-daysAgo*DAY,ejemplo:true});
  return {negocio:"Bodega La Esquina",tasa:t,tasaFecha:now,onboarded:true,clientes:c,movs:[
    m("e1","fiado",8.5,32,"Harina, arroz y aceite"),
    m("e1","fiado",4,25,"Café y azúcar"),
    m("e1","abono",3,24,"Abono en efectivo"),
    m("e2","fiado",12,18,"Refrescos para la fiesta","VES"),
    m("e2","abono",5,6,"Pago móvil","VES"),
    m("e3","fiado",6.25,8,"Pañales"),
    m("e3","fiado",2.5,2,"Pan y queso"),
    m("e4","fiado",5,28,"Cigarros y fósforos"),
    m("e4","abono",5,10,"Pagó completo")
  ]};
}
/* Limpia cualquier dato que entre (almacenamiento o respaldo): solo campos conocidos, tipos correctos y límites de tamaño. */
const MAX_CLIENTES=5000, MAX_MOVS=100000;
const str=(v,max)=>typeof v==="string"?v.slice(0,max):"";
const num=(v,min,max)=>{const n=Number(v);return isFinite(n)&&n>=min&&n<=max?n:null};
const okId=v=>typeof v==="string"&&/^[a-z0-9]{1,24}$/i.test(v);
function clean(d){
  if(!d||typeof d!=="object"||!Array.isArray(d.clientes)||!Array.isArray(d.movs)) return null;
  const now=Date.now();
  const clientes=[], ids=new Set();
  for(const c of d.clientes.slice(0,MAX_CLIENTES)){
    if(!c||!okId(c.id)||ids.has(c.id)) continue;
    const nombre=str(c.nombre,80).trim(); if(!nombre) continue;
    ids.add(c.id);
    clientes.push({id:c.id,nombre,tel:str(c.tel,30),nota:str(c.nota,140),creado:num(c.creado,0,now+DAY)||now,...(c.ejemplo===true?{ejemplo:true}:{})});
  }
  const movs=[];
  for(const m of d.movs.slice(0,MAX_MOVS)){
    if(!m||!okId(m.id)||!ids.has(m.cid)||(m.tipo!=="fiado"&&m.tipo!=="abono")) continue;
    const u=num(m.usd,0.01,1e7), t=num(m.tasa,0.0001,1e9); if(u===null) continue;
    movs.push({id:m.id,cid:m.cid,tipo:m.tipo,usd:Math.round(u*100)/100,moneda:m.moneda==="VES"?"VES":"USD",orig:num(m.orig,0,1e12)||u,tasa:t||1,nota:str(m.nota,140),fecha:num(m.fecha,0,now+DAY)||now,...(m.ejemplo===true?{ejemplo:true}:{})});
  }
  const onboarded=d.onboarded!==false;
  return {negocio:str(d.negocio,60).trim()||(onboarded?"Mi negocio":""),tasa:num(d.tasa,0.0001,1e9)||(onboarded?1:0),tasaFecha:num(d.tasaFecha,0,now+DAY)||now,clientes,movs,onboarded};
}
function emptyDb(){return {negocio:"",tasa:0,tasaFecha:Date.now(),clientes:[],movs:[],onboarded:false}}
function load(){
  try{const raw=localStorage.getItem(KEY); if(raw&&raw.length<20e6){const d=clean(JSON.parse(raw)); if(d) return d;}}catch(e){}
  return emptyDb();
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
let db=load();

/* ---------- formato ---------- */
const f2=new Intl.NumberFormat("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2});
const usd=n=>"$"+f2.format(Math.abs(n)<0.005?0:n);
const bs=n=>"Bs "+f2.format(Math.abs(n)<0.005?0:n);
function parseNum(s){
  if(typeof s!=="string") return NaN;
  s=s.trim().replace(/\s/g,"");
  if(!s) return NaN;
  if(s.includes(",")){s=s.replace(/\./g,"").replace(",",".")}
  else if((s.match(/\./g)||[]).length>1){s=s.replace(/\./g,"")}
  const n=Number(s); return isFinite(n)?n:NaN;
}
function ago(ts){
  const d=Math.floor((Date.now()-ts)/DAY);
  if(d<=0) return "hoy"; if(d===1) return "ayer"; if(d<30) return "hace "+d+" días";
  const m=Math.floor(d/30); return m===1?"hace 1 mes":"hace "+m+" meses";
}
function dstr(ts){const d=new Date(ts);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function fromDstr(v,orig){
  if(orig&&v===dstr(orig)) return orig;
  if(v===dstr(Date.now())) return Date.now();
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||""); if(!m) return null;
  const t=new Date(+m[1],+m[2]-1,+m[3],12).getTime();
  return isFinite(t)?t:null;
}
function fecha(ts){return new Date(ts).toLocaleDateString("es-VE",{day:"numeric",month:"short"})}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function initials(n){const w=n.trim().split(/\s+/);const p=w.length>1?w.filter(x=>x.length>2):w;return ((p[0]||n)[0]+(p[1]?p[1][0]:"")).toUpperCase()}

/* ---------- cálculo ---------- */
function stateOf(cid){
  const ms=db.movs.filter(m=>m.cid===cid).sort((a,b)=>a.fecha-b.fecha);
  let bal=0, lastPay=null, last=null, owingSince=null;
  for(const m of ms){
    const before=bal;
    bal=Math.round((bal+(m.tipo==="fiado"?m.usd:-m.usd))*100)/100;
    if(m.tipo==="abono") lastPay=m.fecha;
    last=m.fecha;
    if(before<=0.004&&bal>0.004) owingSince=m.fecha;
    if(bal<=0.004) owingSince=null;
  }
  const ref=Math.max(lastPay||0,owingSince||0);
  const late=bal>0.004&&ref>0&&(Date.now()-ref)>LATE_DAYS*DAY;
  return {bal,last,lastPay,owingSince,late,movs:ms};
}
function summary(){
  let total=0,debtors=0,late=0;
  for(const c of db.clientes){const s=stateOf(c.id); if(s.bal>0.004){total+=s.bal;debtors++; if(s.late) late++;}}
  return {total:Math.round(total*100)/100,debtors,late};
}
function sortedRows(){
  let rows=db.clientes.map(c=>({c,s:stateOf(c.id)}));
  const q=view.q.trim().toLowerCase();
  if(q) rows=rows.filter(r=>r.c.nombre.toLowerCase().includes(q)||(r.c.tel||"").includes(q));
  if(view.sort==="debe") rows.sort((a,b)=>(b.s.late-a.s.late)||(b.s.bal-a.s.bal));
  else if(view.sort==="nombre") rows.sort((a,b)=>a.c.nombre.localeCompare(b.c.nombre,"es"));
  else rows.sort((a,b)=>(b.s.last||0)-(a.s.last||0));
  return rows;
}

/* ---------- vista ---------- */
const app=document.getElementById("app"), layer=document.getElementById("layer");
let view={name:"list",id:null,q:"",sort:"debe"};

const I={
  search:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.6-5.5A8.4 8.4 0 1 1 21 11.5Z"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>'
};

function headerHTML(){
  return `<header class="top">
    <h1 class="brand">Fiao<small>${esc(db.negocio||"Mi negocio")}</small></h1>
    <div class="rate" title="Tasa del día: bolívares por dólar">
      <label for="tasa">Tasa</label>
      <input id="tasa" inputmode="decimal" enterkeyhint="done" value="${f2.format(db.tasa||0)}" aria-label="Tasa del día en bolívares por dólar">
      <span class="unit">Bs/$</span>
    </div>
    <button class="helpbtn" id="ayuda" aria-label="Cómo se usa"><span class="q" aria-hidden="true">?</span><span class="t">Ayuda</span></button>
    <button class="iconbtn" id="ajustes" aria-label="Ajustes y respaldo">${I.cog}</button>
  </header>`;
}

function listHTML(rows){
  const s=summary();
  const hasEx=db.clientes.some(c=>c.ejemplo);
  const q=view.q.trim();
  return `
  <section class="sum" aria-label="Resumen">
    <div class="eyebrow">Te deben</div>
    <div class="total"><mark>${usd(s.total)}</mark></div>
    <div class="total-bs">${bs(s.total*db.tasa)}</div>
    <div class="stats">
      <span class="chip"><span class="dot"></span>${s.debtors} ${s.debtors===1?"cliente debe":"clientes deben"}</span>
      ${s.late?`<span class="chip late"><span class="dot"></span>${s.late} ${s.late===1?"atrasado":"atrasados"} +${LATE_DAYS} días</span>`:`<span class="chip ok"><span class="dot"></span>Nadie atrasado</span>`}
    </div>
  </section>
  ${!guideSeen()?`<div class="tipcard">
      <div><b>¿Primera vez aquí?</b><span>Aprende a usar Fiao en un minuto, paso a paso.</span></div>
      <button class="btn main" id="verGuia">Ver cómo se usa</button>
      <button class="x" id="cerrarTip" aria-label="No mostrar este aviso">×</button>
    </div>`:""}
  ${hasEx?`<div class="banner"><span>Estás viendo clientes de ejemplo.</span><button class="linkbtn" id="clearEx">Borrar ejemplos y empezar</button></div>`:""}
  <div class="tools">
    <label class="search">${I.search}<span class="sr-only">Buscar cliente</span><input id="q" type="search" enterkeyhint="search" placeholder="Buscar cliente" value="${esc(view.q)}"></label>
    <label class="sr-only" for="sort">Ordenar</label>
    <select class="sort" id="sort">
      <option value="debe"${view.sort==="debe"?" selected":""}>Más deben</option>
      <option value="reciente"${view.sort==="reciente"?" selected":""}>Recientes</option>
      <option value="nombre"${view.sort==="nombre"?" selected":""}>A–Z</option>
    </select>
  </div>
  <div class="list">
    ${rows.length?rows.map(({c,s})=>`
      <button class="row" data-open="${esc(c.id)}"${c.id===view.id&&wideMQ.matches?' aria-current="true"':""}>
        <span class="avatar" aria-hidden="true">${esc(initials(c.nombre))}</span>
        <span class="who"><b>${esc(c.nombre)}</b>
          <span>${s.last?ago(s.last):"sin movimientos"}${s.late?' <em class="tag late">Atrasado</em>':""}${c.ejemplo?' <em class="tag ex">Ejemplo</em>':""}</span></span>
        <span class="owe"><span class="usd${s.bal<=0.004?" zero":""}">${s.bal<=0.004?"Al día":usd(s.bal)}</span>${s.bal>0.004?`<span class="bs">${bs(s.bal*db.tasa)}</span>`:""}</span>
      </button>`).join(""):`<div class="empty"><b>${q?"Nadie con ese nombre":"Tu libreta está vacía"}</b>${q?"Revisa cómo lo escribiste.":"Anota tu primer cliente con el botón “Nuevo cliente”."}</div>`}
  </div>`;
}

function detailHTML(c){
  if(!c) return `<div class="placeholder"><b>Elige un cliente</b>Aquí verás su saldo y sus movimientos.</div>`;
  const s=stateOf(c.id);
  const paid=s.bal<=0.004;
  const since=s.late?Math.max(s.lastPay||0,s.owingSince||0):0;
  return `
  <button class="back" id="back">${I.back}Todos los clientes</button>
  <div class="client-head">
    <div style="min-width:0"><h2>${esc(c.nombre)}</h2>
      <div class="meta">${c.tel?esc(c.tel):"Sin teléfono"}${c.nota?" · "+esc(c.nota):""}</div></div>
    <button class="iconbtn edit" id="editC" aria-label="Editar cliente">${I.pen}</button>
  </div>
  <div class="balance${paid?" paid":""}">
    <div class="eyebrow">${paid?"Está al día":"Debe"}</div>
    <div class="total">${paid?usd(0):`<mark>${usd(s.bal)}</mark>`}</div>
    <div class="total-bs">${paid?(s.bal<-0.004?"Tiene a favor "+usd(-s.bal):"Sin deuda pendiente"):bs(s.bal*db.tasa)+" a tasa de hoy"}</div>
    ${s.late?`<div style="margin-top:8px"><span class="chip late"><span class="dot"></span>Sin abonar desde el ${fecha(since)}</span></div>`:""}
  </div>
  <div class="actions">
    <button class="btn debt" id="addF">${I.plus}Fiar</button>
    <button class="btn pay" id="addA">Abonó</button>
    ${!paid?`<button class="btn wa" id="cobrar">${I.wa}Cobrar por WhatsApp</button>`:""}
  </div>
  <section class="history">
    <div class="history-head"><h3>Movimientos</h3>${s.movs.length?"<span>Toca uno para corregirlo o borrarlo</span>":""}</div>
    <div class="list">
      ${s.movs.length?s.movs.slice().reverse().map(m=>`
        <button class="mov ${m.tipo}" data-mov="${esc(m.id)}" aria-label="Editar ${m.tipo==="fiado"?"fiado":"abono"} del ${fecha(m.fecha)} por ${usd(m.usd)}">
          <span class="sign" aria-hidden="true">${m.tipo==="fiado"?"+":"−"}</span>
          <span class="what"><b>${esc(m.nota||(m.tipo==="fiado"?"Fiado":"Abono"))}</b>
            <span>${m.tipo==="fiado"?"Fiado":"Abono"} · ${fecha(m.fecha)}</span></span>
          <span class="amt"><span class="u">${usd(m.usd)}</span>${m.moneda==="VES"?`<span class="o">${bs(m.orig)} a ${f2.format(m.tasa)}</span>`:""}</span>
        </button>`).join(""):`<div class="empty"><b>Sin movimientos</b>Anota lo que se lleva con “Fiar”.</div>`}
    </div>
  </section>`;
}

function render(){
  document.body.classList.toggle("welcome",!db.onboarded);
  if(!db.onboarded) return renderWelcome();
  const rows=sortedRows();
  if(view.id&&!db.clientes.some(c=>c.id===view.id)){view.id=null;view.name="list"}
  if(wideMQ.matches&&!view.id&&rows.length) view.id=rows[0].c.id;
  const c=db.clientes.find(x=>x.id===view.id);
  const showDetail=view.name==="client"&&!!c;
  document.body.classList.toggle("in-detail",showDetail);
  app.innerHTML=headerHTML()+`<div class="shell${showDetail?" show-detail":""}">
      <section class="pane-list" aria-label="Clientes">${listHTML(rows)}</section>
      <section class="pane-detail" aria-label="Detalle del cliente">${detailHTML(c)}</section>
    </div>
    <button class="fab" id="newClient">${I.plus}Nuevo cliente</button>`;
  bind(c,rows);
}

function bind(c){
  const t=document.getElementById("tasa");
  t.addEventListener("focus",()=>t.select());
  t.addEventListener("change",()=>{
    const n=parseNum(t.value);
    if(!(n>0)){t.value=f2.format(db.tasa);toast("Escribe la tasa así: 36,50");return}
    withUndo("Tasa actualizada: "+f2.format(n)+" Bs/$",()=>{db.tasa=n;db.tasaFecha=Date.now()});
  });
  t.addEventListener("keydown",e=>{if(e.key==="Enter")t.blur()});
  document.getElementById("ajustes").addEventListener("click",settingsSheet);
  document.getElementById("ayuda").addEventListener("click",guideSheet);
  const vg=document.getElementById("verGuia"); if(vg) vg.addEventListener("click",guideSheet);
  const ct=document.getElementById("cerrarTip"); if(ct) ct.addEventListener("click",()=>{markGuide();render()});

  const qi=document.getElementById("q");
  qi.addEventListener("input",e=>{view.q=e.target.value;const pos=qi.selectionStart;render();const n=document.getElementById("q");n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}});
  document.getElementById("sort").addEventListener("change",e=>{view.sort=e.target.value;render()});
  app.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{
    view.name="client";view.id=b.dataset.open;render();
    if(!wideMQ.matches) window.scrollTo(0,0);
  }));
  document.getElementById("newClient").addEventListener("click",()=>clientSheet());
  const ce=document.getElementById("clearEx"); if(ce) ce.addEventListener("click",clearExamples);

  if(!c) return;
  const s=stateOf(c.id);
  document.getElementById("back").addEventListener("click",()=>{view.name="list";render()});
  document.getElementById("editC").addEventListener("click",()=>clientSheet(c));
  document.getElementById("addF").addEventListener("click",()=>movSheet(c,"fiado"));
  document.getElementById("addA").addEventListener("click",()=>movSheet(c,"abono",s.bal));
  const cb=document.getElementById("cobrar"); if(cb) cb.addEventListener("click",()=>waSheet(c,s));
  app.querySelectorAll("[data-mov]").forEach(b=>b.addEventListener("click",()=>{
    const m=db.movs.find(x=>x.id===b.dataset.mov); if(m) movSheet(c,m.tipo,s.bal,m);
  }));
}

/* ---------- bienvenida ---------- */
let wel={step:0,negocio:"",tasa:"",nombre:"",tel:""};
function renderWelcome(){
  const st=wel.step;
  const prog=st>0?`<div class="wel-progress"><span class="eyebrow">Paso ${st} de 3</span><div class="bars" aria-hidden="true">${[1,2,3].map(i=>`<span class="${i<=st?"on":""}"></span>`).join("")}</div></div>`:"";
  let body="";
  if(st===0){
    body=`<h2>Bienvenida a tu libreta de fiado</h2>
      <p class="lead">Fiao lleva la cuenta de lo que te deben, en dólares y en bolívares. La dejamos lista en tres pasos.</p>
      <ul class="wel-points">
        <li><span>1</span><div>El nombre de tu negocio</div></li>
        <li><span>2</span><div>La tasa del dólar de hoy</div></li>
        <li><span>3</span><div>Tu primer cliente</div></li>
      </ul>
      <div class="wel-actions"><button class="btn main" id="wGo">Empezar</button>
      <button class="btn ghost" id="wDemo">Prefiero ver un ejemplo primero</button></div>`;
  }else if(st===1){
    body=`<form id="wf" novalidate><h2>¿Cómo se llama tu negocio?</h2>
      <p class="lead">Aparece en los mensajes de cobro que envías por WhatsApp.</p>
      <div class="field"><label for="wn">Nombre del negocio</label><input id="wn" value="${esc(wel.negocio)}" placeholder="Bodega La Esquina" autocomplete="organization" enterkeyhint="next" maxlength="60"></div>
      <p class="err" id="wer"></p>
      <div class="wel-actions"><button class="btn main">Siguiente</button></div></form>`;
  }else if(st===2){
    body=`<form id="wf" novalidate><h2>¿A cuánto está el dólar hoy?</h2>
      <p class="lead">Escribe cuántos bolívares vale un dólar. Usa la tasa que tú manejas; la puedes cambiar cuando quieras.</p>
      <div class="field"><label for="wt">Tasa del día</label><div class="rate-big"><input id="wt" inputmode="decimal" value="${esc(wel.tasa)}" placeholder="36,50" autocomplete="off" enterkeyhint="next"><span>Bs por $</span></div></div>
      <p class="err" id="wer"></p>
      <div class="wel-actions"><button class="btn main">Siguiente</button></div>
      <div class="wel-alt"><button type="button" class="linkbtn" id="wBack">Atrás</button></div></form>`;
  }else{
    body=`<form id="wf" novalidate><h2>Anota a tu primer cliente</h2>
      <p class="lead">Alguien que te deba, o que suela comprarte fiado.</p>
      <div class="field"><label for="wc">Nombre</label><input id="wc" value="${esc(wel.nombre)}" placeholder="Ej. Señora Carmen" autocomplete="off" enterkeyhint="next" maxlength="80"></div>
      <div class="field"><label for="wp">Teléfono de WhatsApp (opcional)</label><input id="wp" type="tel" inputmode="tel" value="${esc(wel.tel)}" placeholder="0414 123 4567" enterkeyhint="done" maxlength="30"></div>
      <p class="err" id="wer"></p>
      <div class="wel-actions"><button class="btn main">Guardar y empezar</button></div>
      <div class="wel-alt"><button type="button" class="linkbtn" id="wBack">Atrás</button><button type="button" class="linkbtn" id="wSkip">Lo hago después</button></div></form>`;
  }
  app.innerHTML=`<main class="wel"><div class="wel-brand">Fiao</div>${prog}${body}</main>`;
  const go=n=>{wel.step=n;renderWelcome();window.scrollTo(0,0);const i=app.querySelector("input");i&&setTimeout(()=>i.focus(),30)};
  const er=t=>{const e=document.getElementById("wer");if(e)e.textContent=t};
  const back=document.getElementById("wBack"); back&&back.addEventListener("click",()=>go(st-1));
  if(st===0){
    document.getElementById("wGo").addEventListener("click",()=>go(1));
    document.getElementById("wDemo").addEventListener("click",()=>{db=seed();save();view.name="list";view.id=null;render();toast("Estos clientes son de ejemplo. Bórralos cuando quieras empezar.")});
    return;
  }
  const f=document.getElementById("wf");
  f.addEventListener("submit",e=>{
    e.preventDefault();
    if(st===1){
      const v=document.getElementById("wn").value.trim();
      if(!v) return er("Escribe el nombre de tu negocio. Puede ser tu nombre si vendes por tu cuenta.");
      wel.negocio=v.slice(0,60); go(2);
    }else if(st===2){
      const raw=document.getElementById("wt").value; const n=parseNum(raw);
      if(!(n>0)) return er("Escribe la tasa con números, por ejemplo 36,50.");
      if(n>1e9) return er("Esa tasa es demasiado grande. Revisa los ceros.");
      wel.tasa=raw.trim(); go(3);
    }else{
      wel.nombre=document.getElementById("wc").value.trim(); wel.tel=document.getElementById("wp").value.trim();
      if(!wel.nombre) return er("Escribe el nombre del cliente, o toca “Lo hago después”.");
      finishWelcome(true);
    }
  });
  const skip=document.getElementById("wSkip"); skip&&skip.addEventListener("click",()=>finishWelcome(false));
}
function finishWelcome(withClient){
  db.negocio=wel.negocio||db.negocio||"Mi negocio";
  const t=parseNum(wel.tasa); if(t>0){db.tasa=t;db.tasaFecha=Date.now()}
  db.onboarded=true;
  view.name="list";view.id=null;
  if(withClient&&wel.nombre){const id=uid();db.clientes.push({id,nombre:wel.nombre.slice(0,80),tel:wel.tel.slice(0,30),nota:"",creado:Date.now()});view.name="client";view.id=id}
  wel={step:0,negocio:"",tasa:"",nombre:"",tel:""};
  save();render();window.scrollTo(0,0);
  toast(withClient?"¡Listo! Ahora toca “Fiar” para anotar lo que se lleva.":"¡Tu libreta está lista!");
}

/* ---------- ventanas ---------- */
let lastFocus=null;
function openSheet(html,onMount,cls){
  lastFocus=document.activeElement;
  const tEl=document.getElementById("toast"); if(tEl){clearTimeout(tt);tEl.hidden=true}
  layer.innerHTML=`<div class="scrim" id="scrim"><div class="sheet${cls?" "+cls:""}" role="dialog" aria-modal="true" aria-label="${cls==="wide"?"Cómo se usa Fiao":""}">${html}</div></div>`;
  const scrim=document.getElementById("scrim");
  scrim.addEventListener("click",e=>{if(e.target===scrim)closeSheet()});
  document.addEventListener("keydown",escClose);
  onMount&&onMount(scrim.querySelector(".sheet"));
  const f=scrim.querySelector("input:not([hidden]),button"); f&&setTimeout(()=>f.focus(),30);
}
function escClose(e){if(e.key==="Escape")closeSheet()}
function closeSheet(){layer.innerHTML="";document.removeEventListener("keydown",escClose);try{lastFocus&&lastFocus.isConnected&&lastFocus.focus()}catch(e){}}

function clientSheet(c){
  const isNew=!c;
  openSheet(`<h3>${isNew?"Nuevo cliente":"Editar cliente"}</h3>
    <form id="f" novalidate>
      <div class="field"><label for="cn">Nombre</label><input id="cn" value="${esc(c?c.nombre:"")}" placeholder="Ej. Señora Carmen" autocomplete="off" enterkeyhint="next"></div>
      <div class="field"><label for="ct">Teléfono (WhatsApp)</label><input id="ct" type="tel" inputmode="tel" value="${esc(c?c.tel:"")}" placeholder="0414 123 4567" enterkeyhint="next"></div>
      <div class="field"><label for="cnt">Nota</label><input id="cnt" value="${esc(c?c.nota:"")}" placeholder="Dónde vive, cuándo paga…" enterkeyhint="done"></div>
      <p class="err" id="er"></p>
      <div class="row2">
        ${isNew?`<button type="button" class="btn ghost" id="cancel">Cancelar</button>`:`<button type="button" class="btn ghost" id="delC" style="color:var(--margin)">Borrar cliente</button>`}
        <button class="btn main">${isNew?"Guardar":"Guardar cambios"}</button>
      </div>
    </form>`,sh=>{
      sh.querySelector("#f").addEventListener("submit",e=>{
        e.preventDefault();
        const nombre=sh.querySelector("#cn").value.trim();
        if(!nombre){sh.querySelector("#er").textContent="Escribe el nombre del cliente.";return}
        if(nombre.length>80){sh.querySelector("#er").textContent="El nombre es muy largo (máximo 80 letras).";return}
        const tel=sh.querySelector("#ct").value.trim().slice(0,30), nota=sh.querySelector("#cnt").value.trim().slice(0,140);
        closeSheet();
        if(isNew){const id=uid();withUndo("Cliente anotado",()=>{db.clientes.push({id,nombre,tel,nota,creado:Date.now()});view.name="client";view.id=id});if(!wideMQ.matches)window.scrollTo(0,0)}
        else withUndo("Cambios guardados",()=>{const x=db.clientes.find(y=>y.id===c.id);x&&Object.assign(x,{nombre,tel,nota})});
      });
      const ca=sh.querySelector("#cancel"); ca&&ca.addEventListener("click",closeSheet);
      const dc=sh.querySelector("#delC"); dc&&dc.addEventListener("click",()=>{closeSheet();withUndo(c.nombre+" y sus movimientos se borraron",()=>{db.clientes=db.clientes.filter(x=>x.id!==c.id);db.movs=db.movs.filter(m=>m.cid!==c.id);view.name="list";view.id=null})});
    });
}

function movSheet(c,tipo,saldo,edit){
  let moneda=edit?edit.moneda:"USD";
  const rate=edit?edit.tasa:db.tasa;
  const today=dstr(Date.now());
  const label=tipo==="fiado"?"fiado":"abono";
  const startVal=edit?f2.format(edit.moneda==="VES"?edit.orig:edit.usd):"";
  openSheet(`<h3>${edit?"Editar "+label+" de ":(tipo==="fiado"?"Fiar a ":"Abono de ")}${esc(c.nombre)}</h3>
    <form id="f" novalidate>
      <div class="field"><label for="ma">Monto</label>
        <div class="amount-row"><input id="ma" inputmode="decimal" placeholder="0,00" value="${esc(startVal)}" autocomplete="off" enterkeyhint="next">
          <div class="seg" role="group" aria-label="Moneda"><button type="button" data-m="USD" aria-pressed="${moneda==="USD"}">$</button><button type="button" data-m="VES" aria-pressed="${moneda==="VES"}">Bs</button></div></div>
        <div class="hint" id="hint" aria-live="polite">&nbsp;</div></div>
      <div class="field"><label for="mn">${tipo==="fiado"?"¿Qué se llevó?":"Nota"}</label><input id="mn" value="${esc(edit?edit.nota:"")}" placeholder="${tipo==="fiado"?"Harina, aceite…":"Efectivo, pago móvil…"}" autocomplete="off" enterkeyhint="done" maxlength="140"></div>
      <div class="field"><label for="md">Fecha</label><input id="md" type="date" max="${today}" value="${edit?dstr(edit.fecha):today}"></div>
      ${!edit&&tipo==="abono"&&saldo>0.004?`<p class="small" style="margin:-4px 0 6px">Debe ${usd(saldo)}. <button type="button" class="linkbtn" id="all">Pagó todo</button></p>`:""}
      <p class="err" id="er"></p>
      <div class="row2">${edit?`<button type="button" class="btn ghost" id="delM" style="color:var(--margin)">Borrar ${label}</button>`:`<button type="button" class="btn ghost" id="cancel">Cancelar</button>`}
        <button class="btn ${tipo==="fiado"?"debt":"pay"}">${edit?"Guardar cambios":(tipo==="fiado"?"Anotar fiado":"Anotar abono")}</button></div>
    </form>`,sh=>{
      const a=sh.querySelector("#ma"), hint=sh.querySelector("#hint");
      const setM=m=>{moneda=m;sh.querySelectorAll("[data-m]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.m===m)))};
      const upd=()=>{const n=parseNum(a.value); hint.textContent=n>0?(moneda==="USD"?"= "+bs(n*rate)+(edit?" a "+f2.format(rate)+" Bs/$":""):"= "+usd(n/rate)+" a "+f2.format(rate)+" Bs/$"):" "};
      a.addEventListener("input",upd); upd();
      sh.querySelectorAll("[data-m]").forEach(b=>b.addEventListener("click",()=>{setM(b.dataset.m);upd();a.focus()}));
      const all=sh.querySelector("#all"); all&&all.addEventListener("click",()=>{setM("USD");a.value=f2.format(saldo);upd()});
      const ca=sh.querySelector("#cancel"); ca&&ca.addEventListener("click",closeSheet);
      const dm=sh.querySelector("#delM"); dm&&dm.addEventListener("click",()=>{closeSheet();withUndo(label[0].toUpperCase()+label.slice(1)+" borrado",()=>{db.movs=db.movs.filter(m=>m.id!==edit.id)})});
      sh.querySelector("#f").addEventListener("submit",e=>{
        e.preventDefault();
        const er=t=>{sh.querySelector("#er").textContent=t};
        const n=parseNum(a.value);
        if(!(n>0)) return er("Escribe un monto mayor que cero, por ejemplo 5,50.");
        if(n>1e9) return er("Ese monto es demasiado grande. Revisa los ceros.");
        const dv=sh.querySelector("#md").value;
        if(dv&&dv>today) return er("La fecha no puede ser futura.");
        const fecha=fromDstr(dv||today,edit&&edit.fecha);
        if(!fecha) return er("Elige una fecha válida.");
        const u=Math.round((moneda==="USD"?n:n/rate)*100)/100;
        if(!(u>=0.01)) return er("El monto en dólares es menor de un centavo. Revisa la cifra.");
        const nota=sh.querySelector("#mn").value.trim().slice(0,140);
        closeSheet();
        if(edit){
          withUndo("Cambios guardados",()=>{const m=db.movs.find(x=>x.id===edit.id); if(m) Object.assign(m,{usd:u,moneda,orig:n,nota,fecha})});
        }else{
          withUndo(tipo==="fiado"?"Fiado anotado: "+usd(u):"Abono anotado: "+usd(u),()=>{db.movs.push({id:uid(),cid:c.id,tipo,usd:u,moneda,orig:n,tasa:rate,nota,fecha})});
        }
      });
    });
}

/* Guía */
const GUIDE_KEY="fiao.guia";
let guideMem=false;
function guideSeen(){try{return localStorage.getItem(GUIDE_KEY)==="1"}catch(e){return guideMem}}
function markGuide(){guideMem=true;try{localStorage.setItem(GUIDE_KEY,"1")}catch(e){}}
function guideSheet(){
  const steps=document.querySelector("#guia .guide-steps"), before=document.querySelector("#guia .guide-before");
  const had=!guideSeen(); markGuide();
  openSheet(`<h3>Cómo se usa Fiao</h3>${before?before.outerHTML:""}${steps?steps.outerHTML:""}
    <div class="row2" style="margin-top:14px"><button type="button" class="btn main full" id="okGuia">Entendido</button></div>`,sh=>{
      sh.querySelector("#okGuia").addEventListener("click",closeSheet);
    },"wide");
  if(had) render();
}

function waPhone(t){
  let d=(t||"").replace(/\D/g,"");
  if(!d) return "";
  if(d.startsWith("58")) return d;
  if(d.startsWith("0")) d=d.slice(1);
  return "58"+d;
}
function waSheet(c,s){
  const pend=s.movs.filter(m=>m.tipo==="fiado").slice(-3).map(m=>`• ${fecha(m.fecha)}: ${m.nota||"Fiado"} (${usd(m.usd)})`).join("\n");
  const first=c.nombre.trim().split(/\s+/);
  const saludo=/^(señora|señor|sra\.?|sr\.?|don|doña)$/i.test(first[0])?c.nombre.trim():first[0];
  const msg=`Hola ${saludo}, te escribe ${db.negocio||"tu bodega"}.\n\nTu saldo pendiente es de ${usd(s.bal)} (${bs(s.bal*db.tasa)} a tasa de hoy ${f2.format(db.tasa)}).\n\nÚltimos fiados:\n${pend}\n\n¿Cuándo puedes pasar a abonar? ¡Gracias!`;
  const ph=waPhone(c.tel);
  const href="https://wa.me/"+(ph||"")+"?text="+encodeURIComponent(msg);
  openSheet(`<h3>Cobrar a ${esc(c.nombre)}</h3>
    <div class="msgbox" id="msg">${esc(msg)}</div>
    ${ph?"":`<p class="small">Este cliente no tiene teléfono. WhatsApp te pedirá elegir el contacto.</p>`}
    <div class="row2"><button type="button" class="btn ghost" id="copy">Copiar mensaje</button>
      <a class="btn pay" href="${href}" target="_blank" rel="noopener">${I.wa}Abrir WhatsApp</a></div>`,sh=>{
      sh.querySelector("#copy").addEventListener("click",()=>{
        const fallback=()=>{selectText(sh.querySelector("#msg"));toast("Selecciona y copia el texto")};
        try{navigator.clipboard.writeText(msg).then(()=>toast("Mensaje copiado"),fallback)}catch(e){fallback()}
      });
    });
}
function selectText(el){try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}catch(e){}}

function clearExamples(){
  const ownCount=db.clientes.filter(c=>!c.ejemplo).length;
  withUndo("Ejemplos borrados",()=>{
    db.clientes=db.clientes.filter(c=>!c.ejemplo);db.movs=db.movs.filter(m=>!m.ejemplo);view.id=null;view.name="list";
    if(!ownCount){db.onboarded=false;db.negocio="";wel.step=1}
  });
}

function settingsSheet(){
  openSheet(`<h3>Ajustes</h3>
    <form id="f" novalidate>
      <div class="field"><label for="sn">Nombre del negocio</label><input id="sn" value="${esc(db.negocio)}" placeholder="Bodega La Esquina" enterkeyhint="done"></div>
      <p class="small" style="margin:0 0 12px">Aparece en los mensajes de cobro. Tasa guardada ${ago(db.tasaFecha||Date.now())}.</p>
      <button class="btn main full">Guardar</button>
    </form>
    <h3 style="font-size:22px;margin-top:22px">Respaldo</h3>
    <p class="small" style="margin:0 0 10px">Tus datos viven solo en este dispositivo. Guarda un respaldo de vez en cuando por si lo pierdes o cambias de equipo.</p>
    <div class="row2"><button type="button" class="btn ghost" id="exp">Descargar respaldo</button>
      <label class="btn ghost" for="imp" style="cursor:pointer">Cargar respaldo</label><input id="imp" type="file" accept="application/json,.json" hidden></div>
    <p class="err" id="er"></p>`,sh=>{
      sh.querySelector("#f").addEventListener("submit",e=>{e.preventDefault();const v=sh.querySelector("#sn").value.trim().slice(0,60)||"Mi negocio";closeSheet();withUndo("Ajustes guardados",()=>{db.negocio=v})});
      sh.querySelector("#exp").addEventListener("click",()=>{
        try{
          const blob=new Blob([JSON.stringify(db,null,1)],{type:"application/json"});
          const a=document.createElement("a");a.href=URL.createObjectURL(blob);
          a.download="fiao-respaldo-"+new Date().toISOString().slice(0,10)+".json";
          document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast("Respaldo descargado");
        }catch(e){sh.querySelector("#er").textContent="Este navegador no permitió la descarga."}
      });
      sh.querySelector("#imp").addEventListener("change",ev=>{
        const file=ev.target.files[0]; if(!file) return;
        if(file.size>10e6){sh.querySelector("#er").textContent="El archivo es demasiado grande para ser un respaldo de Fiao.";return}
        const r=new FileReader();
        r.onload=()=>{try{const d=clean(JSON.parse(r.result)); if(!d) throw 0; d.onboarded=true; closeSheet();withUndo("Respaldo cargado: "+d.clientes.length+" clientes",()=>{db=d;view.name="list";view.id=null})}
          catch(e){sh.querySelector("#er").textContent="Ese archivo no es un respaldo de Fiao."}};
        r.readAsText(file);
      });
    });
}

let tt;
function toast(t,action){
  let el=document.getElementById("toast");
  if(!el){el=document.createElement("div");el.id="toast";el.className="toast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");document.body.appendChild(el)}
  el.innerHTML=`<span>${esc(t)}</span>${action?`<button type="button">${esc(action.label)}</button>`:""}`;
  if(action) el.querySelector("button").addEventListener("click",()=>{clearTimeout(tt);el.hidden=true;action.fn()});
  el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{el.hidden=true},action?6000:2600);
}
/* Hace un cambio, lo guarda y ofrece deshacerlo durante unos segundos */
function withUndo(msg,fn){
  const snap=JSON.stringify(db), v={name:view.name,id:view.id};
  fn(); save(); render();
  toast(msg,{label:"Deshacer",fn:()=>{try{db=JSON.parse(snap)}catch(e){return}view.name=v.name;view.id=v.id;save();render();toast("Cambio deshecho")}});
}

try{document.getElementById("year").textContent=String(new Date().getFullYear())}catch(e){}
render();
try{wideMQ.addEventListener("change",render)}catch(e){try{wideMQ.addListener(render)}catch(_){}}

/* Modo sin internet en el sitio publicado */
try{
  if("serviceWorker" in navigator&&location.protocol==="https:"&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
    addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
  }
}catch(e){}

window.__fiao={stateOf,summary,parseNum,waPhone,dstr,fromDstr,clean,get db(){return db}};
})();
