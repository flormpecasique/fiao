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
    {id:"e1",nombre:"Señora Carmen",tel:"04141234567",nota:"Casa azul, esquina",ejemplo:true,creado:now-40*DAY,limite:15,diaPago:""},
    {id:"e2",nombre:"José el mototaxista",tel:"04249876543",nota:"",ejemplo:true,creado:now-20*DAY},
    {id:"e3",nombre:"Yuleisy",tel:"04125551122",nota:"",ejemplo:true,creado:now-9*DAY,diaPago:["dom","lun","mar","mie","jue","vie","sab"][new Date().getDay()]},
    {id:"e4",nombre:"Don Ramón",tel:"",nota:"",ejemplo:true,creado:now-30*DAY}
  ];
  const m=(cid,tipo,usd,daysAgo,nota,moneda)=>({id:uid(),cid,tipo,usd,moneda:moneda||"USD",orig:moneda==="VES"?Math.round(usd*t*100)/100:usd,tasa:t,nota,fecha:now-daysAgo*DAY,ejemplo:true});
  const pr=(id,nombre,precio,usos)=>({id,nombre,precio,usos,ejemplo:true});
  return {negocio:"Bodega La Esquina",tasa:t,tasaFecha:now,onboarded:true,lastBackup:now,big:false,clientes:c,
    productos:[pr("p1","Harina PAN",1.2,9),pr("p2","Arroz",1.1,6),pr("p3","Aceite",3.5,5),pr("p4","Café",2.8,4),pr("p5","Azúcar",1.3,3),pr("p6","Pan",1,2)],movs:[
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
const PAY_DAYS=["lun","mar","mie","jue","vie","sab","dom","q","fm"];
const PAY_LABEL={lun:"Lunes",mar:"Martes",mie:"Miércoles",jue:"Jueves",vie:"Viernes",sab:"Sábado",dom:"Domingo",q:"Quincena (15 y fin de mes)",fm:"Fin de mes"};
const PAY_SHORT={lun:"los lunes",mar:"los martes",mie:"los miércoles",jue:"los jueves",vie:"los viernes",sab:"los sábados",dom:"los domingos",q:"la quincena",fm:"fin de mes"};
const MAX_PROD=300;
function clean(d){
  if(!d||typeof d!=="object"||!Array.isArray(d.clientes)||!Array.isArray(d.movs)) return null;
  const now=Date.now();
  const clientes=[], ids=new Set();
  for(const c of d.clientes.slice(0,MAX_CLIENTES)){
    if(!c||!okId(c.id)||ids.has(c.id)) continue;
    const nombre=str(c.nombre,80).trim(); if(!nombre) continue;
    ids.add(c.id);
    clientes.push({id:c.id,nombre,tel:str(c.tel,30),nota:str(c.nota,140),creado:num(c.creado,0,now+DAY)||now,
      diaPago:PAY_DAYS.includes(c.diaPago)?c.diaPago:"",limite:num(c.limite,0.01,1e7),
      ...(c.ejemplo===true?{ejemplo:true}:{})});
  }
  const movs=[];
  for(const m of d.movs.slice(0,MAX_MOVS)){
    if(!m||!okId(m.id)||!ids.has(m.cid)||(m.tipo!=="fiado"&&m.tipo!=="abono")) continue;
    const u=num(m.usd,0.01,1e7), t=num(m.tasa,0.0001,1e9); if(u===null) continue;
    movs.push({id:m.id,cid:m.cid,tipo:m.tipo,usd:Math.round(u*100)/100,moneda:m.moneda==="VES"?"VES":"USD",orig:num(m.orig,0,1e12)||u,tasa:t||1,nota:str(m.nota,140),fecha:num(m.fecha,0,now+DAY)||now,...(m.ejemplo===true?{ejemplo:true}:{})});
  }
  const productos=[], pids=new Set();
  for(const x of (Array.isArray(d.productos)?d.productos:[]).slice(0,MAX_PROD)){
    if(!x||!okId(x.id)||pids.has(x.id)) continue;
    const nombre=str(x.nombre,40).trim(), precio=num(x.precio,0.01,1e6);
    if(!nombre||precio===null) continue;
    pids.add(x.id);
    productos.push({id:x.id,nombre,precio:Math.round(precio*100)/100,usos:Math.floor(num(x.usos,0,1e9)||0),...(x.ejemplo===true?{ejemplo:true}:{})});
  }
  const onboarded=d.onboarded!==false;
  return {negocio:str(d.negocio,60).trim()||(onboarded?"Mi negocio":""),tasa:num(d.tasa,0.0001,1e9)||(onboarded?1:0),tasaFecha:num(d.tasaFecha,0,now+DAY)||now,
    clientes,movs,productos,onboarded,lastBackup:num(d.lastBackup,0,now+DAY)||0,big:d.big===true};
}
function emptyDb(){return {negocio:"",tasa:0,tasaFecha:Date.now(),clientes:[],movs:[],productos:[],onboarded:false,lastBackup:0,big:false}}
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
function startOfDay(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime()}
function daysSince(ts){return Math.round((startOfDay(Date.now())-startOfDay(ts))/DAY)}
function isPayday(c,ts){
  if(!c.diaPago) return false;
  const d=new Date(ts||Date.now()), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  if(c.diaPago==="q") return d.getDate()===15||d.getDate()===last;
  if(c.diaPago==="fm") return d.getDate()===last;
  return ["dom","lun","mar","mie","jue","vie","sab"][d.getDay()]===c.diaPago;
}
function fechaLarga(ts){return new Date(ts).toLocaleDateString("es-VE",{day:"numeric",month:"long",year:"numeric"})}
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
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>'
};

function headerHTML(){
  return `<header class="top">
    <h1 class="brand">Fiao<small>${esc(db.negocio||"Mi negocio")}</small></h1>
    <div class="rate${tasaStale()?" stale":""}" title="Tasa del día: bolívares por dólar">
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
  ${alertHTML()}
  ${todayHTML()}
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
          <span>${s.last?ago(s.last):"sin movimientos"}${s.late?' <em class="tag late">Atrasado</em>':""}${s.bal>0.004&&isPayday(c)?' <em class="tag pay">Paga hoy</em>':""}${c.limite&&s.bal>c.limite+0.004?' <em class="tag over">Sobre límite</em>':""}${c.ejemplo?' <em class="tag ex">Ejemplo</em>':""}</span></span>
        <span class="owe"><span class="usd${s.bal<=0.004?" zero":""}">${s.bal<=0.004?"Al día":usd(s.bal)}</span>${s.bal>0.004?`<span class="bs">${bs(s.bal*db.tasa)}</span>`:""}</span>
      </button>`).join(""):`<div class="empty"><b>${q?"Nadie con ese nombre":"Tu libreta está vacía"}</b>${q?"Revisa cómo lo escribiste.":"Anota tu primer cliente con el botón de abajo."}</div>`}
  </div>
  <button class="addrow" id="newClient">${I.plus}Anotar cliente nuevo</button>`;
}

/* Avisos: tasa no actualizada hoy, o respaldo pendiente */
function tasaStale(){return db.onboarded&&daysSince(db.tasaFecha)>=1}
const SNOOZE_KEY="fiao.respaldo.luego";
function backupDue(){
  const own=db.clientes.filter(c=>!c.ejemplo); if(!own.length) return false;
  try{const sn=+localStorage.getItem(SNOOZE_KEY)||0; if(sn>Date.now()) return false}catch(e){}
  const ref=db.lastBackup||Math.min(...own.map(c=>c.creado||Date.now()));
  return daysSince(ref)>=7;
}
function alertHTML(){
  if(tasaStale()) return `<div class="alert" role="status"><div><b>¿La tasa sigue en ${f2.format(db.tasa)}?</b><span>La pusiste ${ago(db.tasaFecha)}. Revísala para que los montos en Bs salgan bien.</span></div>
    <div class="alert-btns"><button class="btn main" id="tasaFix">Cambiar tasa</button><button class="btn ghost" id="tasaOk">Sigue igual</button></div></div>`;
  if(backupDue()) return `<div class="alert" role="status"><div><b>Guarda un respaldo</b><span>${db.lastBackup?"El último fue "+ago(db.lastBackup):"Todavía no has guardado ninguno"}. Si pierdes el teléfono, pierdes la libreta.</span></div>
    <div class="alert-btns"><button class="btn main" id="bkNow">Guardar respaldo</button><button class="btn ghost" id="bkLater">Más tarde</button></div></div>`;
  return "";
}
function todayHTML(){
  const list=db.clientes.map(c=>({c,s:stateOf(c.id)})).filter(r=>r.s.bal>0.004&&isPayday(r.c)).sort((a,b)=>b.s.bal-a.s.bal);
  if(!list.length) return "";
  const total=list.reduce((t,r)=>t+r.s.bal,0);
  return `<section class="today" aria-label="Hoy toca cobrar"><div class="today-head"><b>Hoy toca cobrar</b><span>${list.length} ${list.length===1?"cliente":"clientes"} · ${usd(total)}</span></div>
    ${list.slice(0,6).map(({c,s})=>`<button class="row" data-open="${esc(c.id)}"><span class="who"><b>${esc(c.nombre)}</b><span>Paga ${PAY_SHORT[c.diaPago]}</span></span><span class="owe"><span class="usd">${usd(s.bal)}</span><span class="bs">${bs(s.bal*db.tasa)}</span></span></button>`).join("")}
  </section>`;
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
      <div class="meta">${c.tel?esc(c.tel):"Sin teléfono"}${c.nota?" · "+esc(c.nota):""}</div>
      ${c.diaPago?`<div class="client-chips"><span class="chip">Paga ${PAY_SHORT[c.diaPago]}</span>${isPayday(c)&&!paid?'<span class="tag pay" style="align-self:center">Hoy</span>':""}</div>`:""}</div>
    <button class="iconbtn edit" id="editC" aria-label="Editar cliente">${I.pen}</button>
  </div>
  <div class="balance${paid?" paid":""}">
    <div class="eyebrow">${paid?"Está al día":"Debe"}</div>
    <div class="total">${paid?usd(0):`<mark>${usd(s.bal)}</mark>`}</div>
    <div class="total-bs">${paid?(s.bal<-0.004?"Tiene a favor "+usd(-s.bal):"Sin deuda pendiente"):bs(s.bal*db.tasa)+" a tasa de hoy"}</div>
    ${s.late?`<div style="margin-top:8px"><span class="chip late"><span class="dot"></span>Sin abonar desde el ${fecha(since)}</span></div>`:""}
    ${c.limite?`<div class="limit${s.bal>c.limite+0.004?" over":""}">Límite de crédito ${usd(c.limite)} · ${s.bal>c.limite+0.004?"lo pasó por "+usd(s.bal-c.limite):"le quedan "+usd(c.limite-Math.max(0,s.bal))}</div>`:""}
  </div>
  <div class="actions">
    <button class="btn debt" id="addF">${I.plus}Fiar</button>
    <button class="btn pay" id="addA">Abonó</button>
    ${!paid?`<button class="btn wa" id="cobrar">${I.wa}Cobrar por WhatsApp</button>`:""}
    ${s.movs.length?`<button class="btn ghost wa" id="estado" style="border-width:1px">${I.doc}Estado de cuenta en imagen</button>`:""}
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
  document.body.classList.toggle("big",!!db.big);
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
    ${db.clientes.length?`<button class="fab" id="quickFiar">${I.plus}Fiar</button>`:`<button class="fab" id="newClientFab">${I.plus}Nuevo cliente</button>`}`;
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
  const qf=document.getElementById("quickFiar"); if(qf) qf.addEventListener("click",pickClientSheet);
  const nf=document.getElementById("newClientFab"); if(nf) nf.addEventListener("click",()=>clientSheet());
  const tf=document.getElementById("tasaFix"); if(tf) tf.addEventListener("click",()=>{window.scrollTo(0,0);const i=document.getElementById("tasa");i.focus();i.select()});
  const tok=document.getElementById("tasaOk"); if(tok) tok.addEventListener("click",()=>{db.tasaFecha=Date.now();save();render();toast("Listo, tasa confirmada para hoy")});
  const bn=document.getElementById("bkNow"); if(bn) bn.addEventListener("click",()=>{exportBackup();render()});
  const bl=document.getElementById("bkLater"); if(bl) bl.addEventListener("click",()=>{try{localStorage.setItem(SNOOZE_KEY,String(Date.now()+3*DAY))}catch(e){}render();toast("Te lo recuerdo en 3 días")});
  const ce=document.getElementById("clearEx"); if(ce) ce.addEventListener("click",clearExamples);

  if(!c) return;
  const s=stateOf(c.id);
  document.getElementById("back").addEventListener("click",()=>{view.name="list";render()});
  document.getElementById("editC").addEventListener("click",()=>clientSheet(c));
  document.getElementById("addF").addEventListener("click",()=>movSheet(c,"fiado"));
  document.getElementById("addA").addEventListener("click",()=>movSheet(c,"abono",s.bal));
  const cb=document.getElementById("cobrar"); if(cb) cb.addEventListener("click",()=>waSheet(c,s));
  const ec=document.getElementById("estado"); if(ec) ec.addEventListener("click",()=>receiptSheet(c,"estado"));
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
function openSheet(html,onMount,cls,opts){
  lastFocus=document.activeElement;
  const tEl=document.getElementById("toast"); if(tEl){clearTimeout(tt);tEl.hidden=true}
  layer.innerHTML=`<div class="scrim" id="scrim"><div class="sheet${cls?" "+cls:""}" role="dialog" aria-modal="true" aria-label="${cls==="wide"?"Cómo se usa Fiao":""}">${html}</div></div>`;
  const scrim=document.getElementById("scrim");
  scrim.addEventListener("click",e=>{if(e.target===scrim)closeSheet()});
  document.addEventListener("keydown",escClose);
  onMount&&onMount(scrim.querySelector(".sheet"));
  if(opts&&opts.noFocus){const sh=scrim.querySelector(".sheet");sh.setAttribute("tabindex","-1");setTimeout(()=>sh.focus({preventScroll:true}),30)}
  else{const f=scrim.querySelector("input:not([hidden]),select,button"); f&&setTimeout(()=>f.focus(),30)}
}
function escClose(e){if(e.key==="Escape")closeSheet()}
function closeSheet(){layer.innerHTML="";document.removeEventListener("keydown",escClose);try{lastFocus&&lastFocus.isConnected&&lastFocus.focus()}catch(e){}}

function clientSheet(c,onCreated){
  const isNew=!c;
  const opts=`<option value="">Sin día fijo</option>`+PAY_DAYS.map(k=>`<option value="${k}"${c&&c.diaPago===k?" selected":""}>${PAY_LABEL[k]}</option>`).join("");
  openSheet(`<h3>${isNew?"Nuevo cliente":"Editar cliente"}</h3>
    <form id="f" novalidate>
      <div class="field"><label for="cn">Nombre</label><input id="cn" value="${esc(c?c.nombre:"")}" placeholder="Ej. Señora Carmen" autocomplete="off" enterkeyhint="next" maxlength="80"></div>
      <div class="field"><label for="ct">Teléfono (WhatsApp)</label><input id="ct" type="tel" inputmode="tel" value="${esc(c?c.tel:"")}" placeholder="0414 123 4567" enterkeyhint="next" maxlength="30"></div>
      <div class="field-row">
        <div class="field"><label for="cd">Día de pago</label><select id="cd">${opts}</select></div>
        <div class="field"><label for="cl">Límite de crédito $</label><input id="cl" inputmode="decimal" value="${c&&c.limite?f2.format(c.limite):""}" placeholder="Sin límite" autocomplete="off"></div>
      </div>
      <div class="field"><label for="cnt">Nota</label><input id="cnt" value="${esc(c?c.nota:"")}" placeholder="Dónde vive, cómo prefiere pagar…" enterkeyhint="done" maxlength="140"></div>
      <p class="err" id="er"></p>
      <div class="row2">
        ${isNew?`<button type="button" class="btn ghost" id="cancel">Cancelar</button>`:`<button type="button" class="btn ghost" id="delC" style="color:var(--margin)">Borrar cliente</button>`}
        <button class="btn main">${isNew?"Guardar":"Guardar cambios"}</button>
      </div>
    </form>`,sh=>{
      sh.querySelector("#f").addEventListener("submit",e=>{
        e.preventDefault();
        const er=t=>{sh.querySelector("#er").textContent=t};
        const nombre=sh.querySelector("#cn").value.trim();
        if(!nombre) return er("Escribe el nombre del cliente.");
        if(nombre.length>80) return er("El nombre es muy largo (máximo 80 letras).");
        const tel=sh.querySelector("#ct").value.trim().slice(0,30), nota=sh.querySelector("#cnt").value.trim().slice(0,140);
        const diaPago=PAY_DAYS.includes(sh.querySelector("#cd").value)?sh.querySelector("#cd").value:"";
        const lr=sh.querySelector("#cl").value.trim(); let limite=null;
        if(lr){limite=parseNum(lr); if(!(limite>0)||limite>1e7) return er("Escribe el límite en dólares, por ejemplo 30, o déjalo vacío.")}
        closeSheet();
        if(isNew){
          const id=uid();
          withUndo("Cliente anotado",()=>{db.clientes.push({id,nombre,tel,nota,diaPago,limite,creado:Date.now()});view.name="client";view.id=id});
          if(!wideMQ.matches)window.scrollTo(0,0);
          if(onCreated){const nc=db.clientes.find(x=>x.id===id); nc&&onCreated(nc)}
        }
        else withUndo("Cambios guardados",()=>{const x=db.clientes.find(y=>y.id===c.id);x&&Object.assign(x,{nombre,tel,nota,diaPago,limite})});
      });
      const ca=sh.querySelector("#cancel"); ca&&ca.addEventListener("click",closeSheet);
      const dc=sh.querySelector("#delC"); dc&&dc.addEventListener("click",()=>{closeSheet();withUndo(c.nombre+" y sus movimientos se borraron",()=>{db.clientes=db.clientes.filter(x=>x.id!==c.id);db.movs=db.movs.filter(m=>m.cid!==c.id);view.name="list";view.id=null})});
    });
}

/* Fiado rápido: elegir cliente */
function pickClientSheet(){
  const recent=db.clientes.map(c=>({c,s:stateOf(c.id)})).sort((a,b)=>(b.s.last||b.c.creado||0)-(a.s.last||a.c.creado||0));
  openSheet(`<h3>¿A quién le fías?</h3>
    <label class="search">${I.search}<span class="sr-only">Buscar cliente</span><input id="pq" type="search" placeholder="Buscar cliente" autocomplete="off" enterkeyhint="search"></label>
    <div class="pick" id="pick"></div>
    <button type="button" class="addrow" id="pNew">${I.plus}Cliente nuevo</button>`,sh=>{
      const box=sh.querySelector("#pick"), inp=sh.querySelector("#pq");
      const draw=()=>{
        const q=inp.value.trim().toLowerCase();
        const list=recent.filter(r=>!q||r.c.nombre.toLowerCase().includes(q)).slice(0,q?40:8);
        box.innerHTML=list.length?list.map(({c,s})=>`<button type="button" class="pick-row" data-pick="${esc(c.id)}"><span class="avatar" aria-hidden="true">${esc(initials(c.nombre))}</span><span><b>${esc(c.nombre)}</b><span>${s.bal>0.004?"Debe "+usd(s.bal):"Al día"}</span></span></button>`).join("")
          :`<p class="small">Nadie con ese nombre. Toca “Cliente nuevo” para anotarlo.</p>`;
        box.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{
          const c=db.clientes.find(x=>x.id===b.dataset.pick); if(!c) return;
          view.name="client";view.id=c.id;render();if(!wideMQ.matches)window.scrollTo(0,0);
          movSheet(c,"fiado");
        }));
      };
      inp.addEventListener("input",draw); draw();
      sh.querySelector("#pNew").addEventListener("click",()=>clientSheet(null,nc=>movSheet(nc,"fiado")));
    },"",{noFocus:true});
}

function movSheet(c,tipo,saldo,edit){
  let moneda=edit?edit.moneda:"USD";
  const rate=edit?edit.tasa:db.tasa;
  const today=dstr(Date.now());
  const label=tipo==="fiado"?"fiado":"abono";
  const startVal=edit?f2.format(edit.moneda==="VES"?edit.orig:edit.usd):"";
  const withProducts=tipo==="fiado"&&!edit;
  const curBal=stateOf(c.id).bal;
  if(saldo==null) saldo=curBal;
  openSheet(`<h3>${edit?"Editar "+label+" de ":(tipo==="fiado"?"Fiar a ":"Abono de ")}${esc(c.nombre)}</h3>
    <form id="f" novalidate>
      ${withProducts?`<div class="field"><div class="label-row"><label id="plabel">Toca lo que se lleva</label>${db.productos.length?'<button type="button" class="linkbtn" id="manageP">Editar precios</button>':""}</div>
        <div class="chips" id="chips" role="group" aria-labelledby="plabel"></div><div class="cart" id="cart" hidden></div></div>`:""}
      <div class="field"><label for="ma">Monto</label>
        <div class="amount-row"><input id="ma" inputmode="decimal" placeholder="0,00" value="${esc(startVal)}" autocomplete="off" enterkeyhint="next">
          <div class="seg" role="group" aria-label="Moneda"><button type="button" data-m="USD" aria-pressed="${moneda==="USD"}">$</button><button type="button" data-m="VES" aria-pressed="${moneda==="VES"}">Bs</button></div></div>
        <div class="hint" id="hint" aria-live="polite">&nbsp;</div>
        <p class="warn" id="warn" aria-live="polite" hidden></p></div>
      <div class="field"><label for="mn">${tipo==="fiado"?"¿Qué se llevó?":"Nota"}</label><input id="mn" value="${esc(edit?edit.nota:"")}" placeholder="${tipo==="fiado"?"Harina, aceite…":"Efectivo, pago móvil…"}" autocomplete="off" enterkeyhint="done" maxlength="140"></div>
      <div class="field"><label for="md">Fecha</label><input id="md" type="date" max="${today}" value="${edit?dstr(edit.fecha):today}"></div>
      ${!edit&&tipo==="abono"&&saldo>0.004?`<p class="small" style="margin:-4px 0 6px">Debe ${usd(saldo)}. <button type="button" class="linkbtn" id="all">Pagó todo</button></p>`:""}
      <p class="err" id="er"></p>
      ${edit&&tipo==="abono"?`<button type="button" class="btn ghost full" id="recM" style="margin-bottom:10px">${I.doc}Enviar comprobante</button>`:""}
      <div class="row2">${edit?`<button type="button" class="btn ghost" id="delM" style="color:var(--margin)">Borrar ${label}</button>`:`<button type="button" class="btn ghost" id="cancel">Cancelar</button>`}
        <button class="btn ${tipo==="fiado"?"debt":"pay"}">${edit?"Guardar cambios":(tipo==="fiado"?"Anotar fiado":"Anotar abono")}</button></div>
    </form>`,sh=>{
      const a=sh.querySelector("#ma"), hint=sh.querySelector("#hint"), warn=sh.querySelector("#warn"), mn=sh.querySelector("#mn");
      const setM=m=>{moneda=m;sh.querySelectorAll("[data-m]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.m===m)))};
      const upd=()=>{
        const n=parseNum(a.value);
        hint.textContent=n>0?(moneda==="USD"?"= "+bs(n*rate)+(edit?" a "+f2.format(rate)+" Bs/$":""):"= "+usd(n/rate)+" a "+f2.format(rate)+" Bs/$"):" ";
        if(tipo==="fiado"&&c.limite){
          const u=n>0?(moneda==="USD"?n:n/rate):0;
          const nb=curBal-(edit?edit.usd:0)+u;
          if(nb>c.limite+0.004){warn.hidden=false;warn.textContent=`Con esto debería ${usd(nb)} y su límite es ${usd(c.limite)}.`}else warn.hidden=true;
        }
      };
      a.addEventListener("input",upd); upd();
      sh.querySelectorAll("[data-m]").forEach(b=>b.addEventListener("click",()=>{setM(b.dataset.m);upd();a.focus()}));
      const all=sh.querySelector("#all"); all&&all.addEventListener("click",()=>{setM("USD");a.value=f2.format(saldo);upd()});
      const ca=sh.querySelector("#cancel"); ca&&ca.addEventListener("click",closeSheet);
      const dm=sh.querySelector("#delM"); dm&&dm.addEventListener("click",()=>{closeSheet();withUndo(label[0].toUpperCase()+label.slice(1)+" borrado",()=>{db.movs=db.movs.filter(m=>m.id!==edit.id)})});
      const rm=sh.querySelector("#recM"); rm&&rm.addEventListener("click",()=>receiptSheet(c,"abono",edit.id));

      /* Productos frecuentes */
      const cart={}; let notaTouched=false;
      mn.addEventListener("input",()=>{notaTouched=!!mn.value.trim()});
      const prods=()=>db.productos.slice().sort((x,y)=>y.usos-x.usos||x.nombre.localeCompare(y.nombre,"es")).slice(0,18);
      const cartText=()=>Object.keys(cart).map(id=>{const p=db.productos.find(x=>x.id===id);return p?`${cart[id]}× ${p.nombre}`:""}).filter(Boolean).join(", ");
      const applyCart=()=>{
        const ids=Object.keys(cart);
        if(ids.length){
          const total=ids.reduce((t,id)=>{const p=db.productos.find(x=>x.id===id);return t+(p?p.precio*cart[id]:0)},0);
          setM("USD"); a.value=f2.format(Math.round(total*100)/100);
          if(!notaTouched) mn.value=cartText().slice(0,140);
        }else{ if(!notaTouched) mn.value=""; a.value=""; }
        upd(); drawChips(); drawCart();
      };
      const drawCart=()=>{
        const box=sh.querySelector("#cart"); if(!box) return;
        const ids=Object.keys(cart); box.hidden=!ids.length;
        box.innerHTML=ids.map(id=>{const p=db.productos.find(x=>x.id===id);return p?`<button type="button" class="citem" data-minus="${esc(id)}" aria-label="Quitar un ${esc(p.nombre)}">${cart[id]}× ${esc(p.nombre)}<span aria-hidden="true">−</span></button>`:""}).join("")+(ids.length?`<button type="button" class="linkbtn" id="cartClear" style="font-size:13px">Vaciar</button>`:"");
        box.querySelectorAll("[data-minus]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.minus;cart[id]--;if(cart[id]<=0)delete cart[id];applyCart()}));
        const cc=box.querySelector("#cartClear"); cc&&cc.addEventListener("click",()=>{for(const k in cart)delete cart[k];applyCart()});
      };
      const drawChips=()=>{
        const box=sh.querySelector("#chips"); if(!box) return;
        const list=prods();
        box.innerHTML=list.map(p=>`<button type="button" class="pchip${cart[p.id]?" on":""}" data-p="${esc(p.id)}"><span>${esc(p.nombre)}</span><b>${usd(p.precio)}</b>${cart[p.id]?`<i>${cart[p.id]}</i>`:""}</button>`).join("")
          +`<button type="button" class="pchip add" id="addP">${list.length?"+ Producto":"+ Guardar un producto con su precio"}</button>`;
        box.querySelectorAll("[data-p]").forEach(b=>b.addEventListener("click",()=>{cart[b.dataset.p]=(cart[b.dataset.p]||0)+1;applyCart()}));
        box.querySelector("#addP").addEventListener("click",()=>{
          box.innerHTML=`<div class="newp" style="width:100%"><input id="npn" placeholder="Producto (ej. Harina PAN)" maxlength="40" aria-label="Nombre del producto" autocomplete="off"><input id="npp" inputmode="decimal" placeholder="Precio $" aria-label="Precio en dólares" autocomplete="off">
            <div class="newp-btns"><button type="button" class="btn main" id="npSave">Guardar producto</button><button type="button" class="linkbtn" id="npCancel">Cancelar</button></div></div>`;
          box.querySelector("#npn").focus();
          box.querySelector("#npCancel").addEventListener("click",drawChips);
          box.querySelector("#npSave").addEventListener("click",()=>{
            const nombre=box.querySelector("#npn").value.trim().slice(0,40), precio=parseNum(box.querySelector("#npp").value);
            if(!nombre){sh.querySelector("#er").textContent="Escribe el nombre del producto.";return}
            if(!(precio>0)||precio>1e6){sh.querySelector("#er").textContent="Escribe el precio en dólares, por ejemplo 1,20.";return}
            sh.querySelector("#er").textContent="";
            const id=uid(); db.productos.push({id,nombre,precio:Math.round(precio*100)/100,usos:0}); save();
            cart[id]=(cart[id]||0)+1; applyCart();
          });
        });
      };
      if(withProducts){drawChips();drawCart()}
      const mp=sh.querySelector("#manageP"); mp&&mp.addEventListener("click",()=>productsSheet(()=>movSheet(c,tipo,saldo)));

      sh.querySelector("#f").addEventListener("submit",e=>{
        e.preventDefault();
        const er=t=>{sh.querySelector("#er").textContent=t};
        const n=parseNum(a.value);
        if(!(n>0)) return er(withProducts?"Toca un producto o escribe el monto, por ejemplo 5,50.":"Escribe un monto mayor que cero, por ejemplo 5,50.");
        if(n>1e9) return er("Ese monto es demasiado grande. Revisa los ceros.");
        const dv=sh.querySelector("#md").value;
        if(dv&&dv>today) return er("La fecha no puede ser futura.");
        const fecha=fromDstr(dv||today,edit&&edit.fecha);
        if(!fecha) return er("Elige una fecha válida.");
        const u=Math.round((moneda==="USD"?n:n/rate)*100)/100;
        if(!(u>=0.01)) return er("El monto en dólares es menor de un centavo. Revisa la cifra.");
        const nota=mn.value.trim().slice(0,140);
        const used={...cart};
        closeSheet();
        if(edit){
          withUndo("Cambios guardados",()=>{const m=db.movs.find(x=>x.id===edit.id); if(m) Object.assign(m,{usd:u,moneda,orig:n,nota,fecha})});
        }else{
          const id=uid();
          const extra=tipo==="abono"?{label:"Comprobante",fn:()=>receiptSheet(c,"abono",id)}:null;
          withUndo(tipo==="fiado"?"Fiado anotado: "+usd(u):"Abono anotado: "+usd(u),()=>{
            db.movs.push({id,cid:c.id,tipo,usd:u,moneda,orig:n,tasa:rate,nota,fecha});
            for(const pid in used){const p=db.productos.find(x=>x.id===pid); if(p) p.usos+=used[pid]}
          },extra);
        }
      });
    });
}

/* Productos y precios */
function productsSheet(onDone){
  openSheet(`<h3>Productos y precios</h3>
    <p class="small" style="margin:0 0 8px">Aparecen al fiar para anotar con un toque. Precios en dólares; cámbialos aquí cuando suban.</p>
    <div id="plist"></div>
    <div class="field" style="margin-top:14px"><label for="npn2">Agregar producto</label>
      <div class="newp"><input id="npn2" placeholder="Producto" maxlength="40" autocomplete="off"><input id="npp2" inputmode="decimal" placeholder="Precio $" autocomplete="off" aria-label="Precio en dólares">
      <div class="newp-btns"><button type="button" class="btn main" id="pAdd">Agregar</button></div></div></div>
    <p class="err" id="er"></p>
    <button type="button" class="btn ghost full" id="pDone">Listo</button>`,sh=>{
      const er=t=>{sh.querySelector("#er").textContent=t};
      const draw=()=>{
        const box=sh.querySelector("#plist");
        const list=db.productos.slice().sort((x,y)=>x.nombre.localeCompare(y.nombre,"es"));
        box.innerHTML=list.length?list.map(p=>`<div class="prow"><span class="pn">${esc(p.nombre)}</span>
          <label class="pp"><span aria-hidden="true">$</span><input inputmode="decimal" value="${f2.format(p.precio)}" data-price="${esc(p.id)}" aria-label="Precio de ${esc(p.nombre)} en dólares"></label>
          <button type="button" class="iconbtn" data-delp="${esc(p.id)}" aria-label="Quitar ${esc(p.nombre)}">×</button></div>`).join("")
          :`<p class="small">Todavía no tienes productos. Agrega los que más fías: harina, arroz, aceite…</p>`;
        box.querySelectorAll("[data-price]").forEach(i=>i.addEventListener("change",()=>{
          const p=db.productos.find(x=>x.id===i.dataset.price); if(!p) return;
          const v=parseNum(i.value);
          if(!(v>0)||v>1e6){i.value=f2.format(p.precio);er("Escribe el precio en dólares, por ejemplo 1,20.");return}
          er(""); p.precio=Math.round(v*100)/100; i.value=f2.format(p.precio); save(); toast("Precio de "+p.nombre+": "+usd(p.precio));
        }));
        box.querySelectorAll("[data-delp]").forEach(b=>b.addEventListener("click",()=>{
          const p=db.productos.find(x=>x.id===b.dataset.delp); if(!p) return;
          db.productos=db.productos.filter(x=>x.id!==p.id); save(); draw(); toast(p.nombre+" quitado de tus productos");
        }));
      };
      draw();
      sh.querySelector("#pAdd").addEventListener("click",()=>{
        const nombre=sh.querySelector("#npn2").value.trim().slice(0,40), precio=parseNum(sh.querySelector("#npp2").value);
        if(!nombre) return er("Escribe el nombre del producto.");
        if(!(precio>0)||precio>1e6) return er("Escribe el precio en dólares, por ejemplo 1,20.");
        er(""); db.productos.push({id:uid(),nombre,precio:Math.round(precio*100)/100,usos:0}); save();
        sh.querySelector("#npn2").value=""; sh.querySelector("#npp2").value=""; draw(); sh.querySelector("#npn2").focus();
      });
      sh.querySelector("#pDone").addEventListener("click",()=>{closeSheet(); onDone&&onDone()});
    });
}

/* ---------- Estado de cuenta y comprobante ---------- */
function receiptSpec(c,kind,movId){
  const s=stateOf(c.id), ms=s.movs, run=[]; let b=0;
  ms.forEach(m=>{b=Math.round((b+(m.tipo==="fiado"?m.usd:-m.usd))*100)/100; run.push(b)});
  const row=m=>({fecha:fecha(m.fecha),desc:m.nota||(m.tipo==="fiado"?"Fiado":"Abono"),usd:m.usd,tipo:m.tipo,orig:m.moneda==="VES"?bs(m.orig):""});
  if(kind==="abono"){
    const i=ms.findIndex(m=>m.id===movId); if(i<0) return null;
    const m=ms[i];
    return {kind,titulo:"Comprobante de abono",negocio:db.negocio,cliente:c.nombre,fechaDoc:fechaLarga(m.fecha),
      rows:[row(m)],prev:i>0?run[i-1]:0,prevLabel:"Debía",saldo:run[i],saldoLabel:"Queda debiendo",tasa:db.tasa};
  }
  // Estado de cuenta: desde la última vez que quedó en cero (o los últimos movimientos si está al día)
  let start=0; run.forEach((v,i)=>{if(v<=0.004&&i<run.length-1) start=i+1});
  if(s.bal<=0.004) start=Math.max(0,ms.length-8);
  const MAXR=16; if(ms.length-start>MAXR) start=ms.length-MAXR;
  return {kind,titulo:"Estado de cuenta",negocio:db.negocio,cliente:c.nombre,fechaDoc:fechaLarga(Date.now()),
    rows:ms.slice(start).map(row),prev:start>0?run[start-1]:0,prevLabel:"Saldo anterior",saldo:s.bal,saldoLabel:s.bal>0.004?"Saldo pendiente":"Está al día",tasa:db.tasa};
}
function receiptText(sp){
  const lines=[`*${sp.titulo} · ${sp.negocio}*`,`Cliente: ${sp.cliente}`,sp.fechaDoc,""];
  if(Math.abs(sp.prev)>0.004) lines.push(`${sp.prevLabel}: ${usd(sp.prev)}`);
  sp.rows.forEach(r=>lines.push(`${r.fecha} · ${r.desc}: ${r.tipo==="fiado"?"+":"−"}${usd(r.usd)}`));
  lines.push("",`*${sp.saldoLabel}: ${usd(Math.max(0,sp.saldo))}*${sp.saldo>0.004?` (${bs(sp.saldo*sp.tasa)} a tasa ${f2.format(sp.tasa)})`:""}`);
  return lines.join("\n");
}
async function drawReceipt(sp){
  try{await Promise.all(['700 60px "Kalam"','600 30px "Figtree"','700 30px "Figtree"','400 30px "Figtree"','600 30px "IBM Plex Mono"','400 26px "IBM Plex Mono"'].map(f=>document.fonts.load(f)))}catch(e){}
  const W=1080, RH=84, hasPrev=Math.abs(sp.prev)>0.004;
  const H=330+(sp.rows.length+(hasPrev?1:0))*RH+330;
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const x=cv.getContext("2d");
  const INK="#1d2a57", MUT="#5b668c", RED="#c93a52", OK="#147a52", HI="#ffe46b";
  const HAND='"Kalam","Comic Sans MS",cursive', BODY='"Figtree",system-ui,sans-serif', MONO='"IBM Plex Mono",ui-monospace,monospace';
  x.fillStyle="#ffffff"; x.fillRect(0,0,W,H);
  x.strokeStyle="rgba(45,85,180,.07)"; x.lineWidth=2;
  for(let i=36;i<W;i+=36){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
  for(let j=36;j<H;j+=36){x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
  x.fillStyle=RED; x.globalAlpha=.8; x.fillRect(58,0,4,H); x.globalAlpha=1;
  const L=104, Rr=W-72;
  const fit=(t,max)=>{if(x.measureText(t).width<=max) return t; while(t.length>1&&x.measureText(t+"…").width>max) t=t.slice(0,-1); return t+"…"};
  x.textBaseline="alphabetic";
  x.fillStyle=INK; x.font=`700 64px ${HAND}`; x.fillText(fit(sp.negocio,Rr-L),L,120);
  x.fillStyle=MUT; x.font=`700 26px ${BODY}`; x.fillText(sp.titulo.toUpperCase().split("").join(String.fromCharCode(8202)),L,172);
  x.fillStyle=INK; x.font=`600 38px ${BODY}`; x.fillText(fit("Cliente: "+sp.cliente,Rr-L),L,232);
  x.fillStyle=MUT; x.font=`400 28px ${BODY}`; x.fillText(sp.fechaDoc,L,276);
  const dash=y=>{x.save();x.strokeStyle="#c9d0e6";x.lineWidth=3;x.setLineDash([12,10]);x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke();x.restore()};
  let y=310; dash(y);
  const line=(fechaT,desc,amt,color,sub,italic)=>{
    y+=RH;
    x.fillStyle=MUT; x.font=`400 26px ${MONO}`; x.fillText(fechaT,L,y-30);
    x.font=`600 34px ${MONO}`; const aw=x.measureText(amt).width;
    x.fillStyle=INK; x.font=`${italic?"italic ":""}${italic?400:600} 32px ${BODY}`; x.fillText(fit(desc,Rr-L-150-aw-30),L+150,y-30);
    x.fillStyle=color; x.font=`600 34px ${MONO}`; x.textAlign="right"; x.fillText(amt,Rr,y-30);
    if(sub){x.fillStyle=MUT;x.font=`400 22px ${MONO}`;x.fillText(sub,Rr,y-2)}
    x.textAlign="left";
  };
  if(hasPrev) line("",sp.prevLabel,usd(sp.prev),INK,"",true);
  sp.rows.forEach(r=>line(r.fecha,r.desc,(r.tipo==="fiado"?"+":"−")+usd(r.usd),r.tipo==="fiado"?RED:OK,r.orig));
  y+=34; dash(y);
  y+=96;
  x.fillStyle=INK; x.font=`700 36px ${BODY}`; x.fillText(sp.saldoLabel,L,y);
  const tot=usd(Math.max(0,sp.saldo));
  x.font=`600 76px ${MONO}`; x.textAlign="right";
  const tw=x.measureText(tot).width;
  x.fillStyle=sp.saldo>0.004?HI:"#c9f0dc"; x.fillRect(Rr-tw-10,y-30,tw+20,40);
  x.fillStyle=INK; x.fillText(tot,Rr,y+6);
  if(sp.saldo>0.004){x.fillStyle=MUT;x.font=`400 28px ${MONO}`;x.fillText(bs(sp.saldo*sp.tasa)+" a tasa "+f2.format(sp.tasa),Rr,y+56)}
  x.textAlign="left";
  x.fillStyle=MUT; x.font=`400 24px ${BODY}`; x.fillText("Hecho con",L,H-56);
  const hw=x.measureText("Hecho con ").width;
  x.fillStyle=INK; x.font=`700 34px ${HAND}`; x.fillText("Fiao",L+hw,H-54);
  return await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error("png")),"image/png"));
}
function receiptSheet(c,kind,movId){
  const sp=receiptSpec(c,kind,movId); if(!sp) return;
  const text=receiptText(sp), ph=waPhone(c.tel);
  const fname=(kind==="abono"?"comprobante-":"estado-de-cuenta-")+c.nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30)+".png";
  let blob=null, url="";
  openSheet(`<h3>${esc(sp.titulo)}</h3>
    <div class="rprev" id="rprev"><span class="small">Preparando la imagen…</span></div>
    <div class="stack">
      <button type="button" class="btn pay" id="rShare" disabled>${I.wa}Enviar imagen</button>
      <a class="btn ghost" id="rText" href="https://wa.me/${ph}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Enviar como texto por WhatsApp</a>
      <div class="row2" style="margin-top:0"><button type="button" class="btn ghost" id="rSave" disabled>Guardar imagen</button><button type="button" class="btn ghost" id="rCopy">Copiar texto</button></div>
    </div>
    <p class="err" id="er"></p>`,async sh=>{
      const er=t=>{sh.querySelector("#er").textContent=t};
      const saveImg=()=>{try{const a=document.createElement("a");a.href=url;a.download=fname;document.body.appendChild(a);a.click();a.remove();toast("Imagen guardada")}catch(e){er("Este navegador no permitió guardar la imagen.")}};
      sh.querySelector("#rCopy").addEventListener("click",()=>{try{navigator.clipboard.writeText(text).then(()=>toast("Texto copiado"),()=>er("No se pudo copiar. Usa “Enviar como texto”."))}catch(e){er("No se pudo copiar. Usa “Enviar como texto”.")}});
      try{
        blob=await drawReceipt(sp); url=URL.createObjectURL(blob);
        const box=sh.querySelector("#rprev"); if(!box) return;
        box.innerHTML=`<img src="${url}" alt="${esc(sp.titulo)} de ${esc(c.nombre)}: ${esc(sp.saldoLabel)} ${usd(Math.max(0,sp.saldo))}">`;
        sh.querySelector("#rShare").disabled=false; sh.querySelector("#rSave").disabled=false;
      }catch(e){er("No se pudo crear la imagen. Puedes enviarlo como texto.");return}
      sh.querySelector("#rSave").addEventListener("click",saveImg);
      sh.querySelector("#rShare").addEventListener("click",async()=>{
        const file=new File([blob],fname,{type:"image/png"});
        try{
          if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:sp.titulo,text:sp.titulo+" · "+sp.negocio});return}
        }catch(e){if(e&&e.name==="AbortError")return}
        saveImg(); er("Tu navegador no deja compartir imágenes directo. La guardamos en tu teléfono: adjúntala en el chat de WhatsApp.");
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
    db.clientes=db.clientes.filter(c=>!c.ejemplo);db.movs=db.movs.filter(m=>!m.ejemplo);db.productos=db.productos.filter(p=>!p.ejemplo);view.id=null;view.name="list";
    if(!ownCount){db.onboarded=false;db.negocio="";wel.step=1}
  });
}

function exportBackup(){
  try{
    db.lastBackup=Date.now(); save();
    const blob=new Blob([JSON.stringify(db,null,1)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download="fiao-respaldo-"+dstr(Date.now())+".json";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast("Respaldo descargado. Guárdalo en tu correo o en Drive.");
    return true;
  }catch(e){toast("Este navegador no permitió la descarga.");return false}
}
let installEvt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e});
addEventListener("appinstalled",()=>{installEvt=null;toast("Fiao quedó instalada en tu teléfono")});
const FEEDBACK=((document.querySelector('meta[name="fiao-feedback"]')||{}).content||"").replace(/\D/g,"");
const feedbackHref=()=>"https://wa.me/"+FEEDBACK+"?text="+encodeURIComponent("Hola Flor, uso Fiao y tengo una sugerencia: ");

function settingsSheet(){
  openSheet(`<h3>Ajustes</h3>
    <form id="f" novalidate>
      <div class="field"><label for="sn">Nombre del negocio</label><input id="sn" value="${esc(db.negocio)}" placeholder="Bodega La Esquina" enterkeyhint="done" maxlength="60"></div>
      <p class="small" style="margin:0 0 12px">Aparece en los mensajes de cobro y en los recibos.</p>
      <button class="btn main full">Guardar nombre</button>
    </form>
    <div class="set-sec"><h4>Pantalla</h4>
      <label class="switch" for="big"><span><b>Letra grande</b><br><span class="small">Todo se ve más grande y fácil de tocar.</span></span><input type="checkbox" id="big"${db.big?" checked":""}></label>
      ${installEvt?`<button type="button" class="btn ghost full" id="inst" style="margin-top:10px">Instalar Fiao en este teléfono</button>`:""}
    </div>
    <div class="set-sec"><h4>Productos</h4>
      <button type="button" class="btn ghost full" id="prods">Productos y precios (${db.productos.length})</button>
    </div>
    <div class="set-sec"><h4>Respaldo</h4>
      <p class="small" style="margin:0 0 10px">Tus datos viven solo en este dispositivo. ${db.lastBackup?"Último respaldo: "+ago(db.lastBackup)+".":"Aún no has guardado ningún respaldo."}</p>
      <div class="row2" style="margin-top:0"><button type="button" class="btn ghost" id="exp">Descargar respaldo</button>
        <label class="btn ghost" for="imp" style="cursor:pointer">Cargar respaldo</label><input id="imp" type="file" accept="application/json,.json" hidden></div>
    </div>
    ${FEEDBACK.length>=8?`<div class="set-sec"><h4>¿Ideas o problemas?</h4><a class="btn ghost full" href="${feedbackHref()}" target="_blank" rel="noopener">${I.wa}Envíale una sugerencia a Flor</a></div>`:""}
    <p class="err" id="er"></p>`,sh=>{
      sh.querySelector("#f").addEventListener("submit",e=>{e.preventDefault();const v=sh.querySelector("#sn").value.trim().slice(0,60)||"Mi negocio";closeSheet();withUndo("Nombre guardado",()=>{db.negocio=v})});
      sh.querySelector("#big").addEventListener("change",e=>{db.big=e.target.checked;save();render();toast(db.big?"Letra grande activada":"Letra normal")});
      const ins=sh.querySelector("#inst"); ins&&ins.addEventListener("click",async()=>{try{installEvt.prompt();await installEvt.userChoice}catch(e){}installEvt=null;closeSheet()});
      sh.querySelector("#prods").addEventListener("click",()=>productsSheet(settingsSheet));
      sh.querySelector("#exp").addEventListener("click",()=>{if(exportBackup()){closeSheet();render()}});
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
function toast(t,actions){
  let el=document.getElementById("toast");
  if(!el){el=document.createElement("div");el.id="toast";el.className="toast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");document.body.appendChild(el)}
  const acts=(Array.isArray(actions)?actions:actions?[actions]:[]).filter(Boolean);
  el.innerHTML=`<span>${esc(t)}</span>`+acts.map((a,i)=>`<button type="button" data-i="${i}">${esc(a.label)}</button>`).join("");
  el.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{clearTimeout(tt);el.hidden=true;acts[+b.dataset.i].fn()}));
  el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{el.hidden=true},acts.length?7000:2600);
}
/* Hace un cambio, lo guarda y ofrece deshacerlo durante unos segundos */
function withUndo(msg,fn,extra){
  const snap=JSON.stringify(db), v={name:view.name,id:view.id};
  fn(); save(); render();
  toast(msg,[extra,{label:"Deshacer",fn:()=>{try{db=JSON.parse(snap)}catch(e){return}view.name=v.name;view.id=v.id;save();render();toast("Cambio deshecho")}}]);
}

/* Enlace de sugerencias en el pie, si está configurado */
try{if(FEEDBACK.length>=8){const p=document.querySelector(".credit p");if(p){p.insertAdjacentHTML("beforeend",` · <a href="${feedbackHref()}" target="_blank" rel="noopener">Sugerencias</a>`)}}}catch(e){}

try{document.getElementById("year").textContent=String(new Date().getFullYear())}catch(e){}
render();
try{wideMQ.addEventListener("change",render)}catch(e){try{wideMQ.addListener(render)}catch(_){}}

/* Modo sin internet en el sitio publicado */
try{
  if("serviceWorker" in navigator&&location.protocol==="https:"&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
    addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
  }
}catch(e){}

window.__fiao={stateOf,summary,parseNum,waPhone,dstr,fromDstr,clean,isPayday,receiptSpec,receiptText,drawReceipt,tasaStale,backupDue,get db(){return db}};
})();
