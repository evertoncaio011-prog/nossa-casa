const $=s=>document.querySelector(s);
const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toC=s=>Math.round(parseFloat(String(s).replace(/\./g,'').replace(',','.')||0)*100)||0;
const fmtD=d=>d.split('-').reverse().join('/');
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const uid=()=>Math.random().toString(36).slice(2,10);
const CATS0=['Água','Energia elétrica','Internet','Aluguel ou financiamento','Condomínio','Gás','Telefone','Mercado','Transporte','Saúde','Assinaturas','Educação','Cartão de crédito','Outros'];
const METH=['Pix','Boleto','Cartão','Débito automático','Dinheiro','Outra'];
let S,page='dash',ym=today().slice(0,7),filt={q:'',cat:'',st:'',type:'',meth:''},calSel=null;
function load(){try{S=JSON.parse(localStorage.getItem('casa-v1'))}catch(e){}if(!S)S=demo()}
function save(){try{localStorage.setItem('casa-v1',JSON.stringify(S))}catch(e){}}
function demo(){const m=today().slice(0,7),t=today(),d=x=>m+'-'+pad(x),pm=(n)=>{const [y,mo]=m.split('-').map(Number);const dt=new Date(y,mo-1+n,1);return dt.getFullYear()+'-'+pad(dt.getMonth()+1)};
const mk=(name,cat,v,day,meth)=>({id:uid(),name,cat,amount:v,due:d(day),type:'fixa',rec:'mensal',method:meth,notes:'',demo:1});
const b=[mk('Aluguel','Aluguel ou financiamento',120000,5,'Boleto'),mk('Energia','Energia elétrica',18000,8,'Boleto'),mk('Água','Água',9000,12,'Boleto'),mk('Internet','Internet',12000,10,'Pix'),mk('Mercado','Mercado',65000,28,'Cartão'),mk('Cartão de crédito','Cartão de crédito',50000,20,'Boleto')];
b.forEach(x=>x.tpl=x.id);const p=[{id:uid(),billId:b[0].id,paid:120000,fee:0,disc:0,date:d(4),method:'Boleto',notes:'',demo:1},{id:uid(),billId:b[3].id,paid:12000,fee:0,disc:0,date:d(9),method:'Pix',notes:'',demo:1},{id:uid(),billId:b[2].id,paid:4000,fee:0,disc:0,date:d(11),method:'Pix',notes:'Parcial',demo:1}];
const bud={};bud[m]={init:350000,extra:50000};return{bills:b,pays:p,bud,cats:[]}}
const allCats=()=>[...CATS0,...S.cats];
function lastDay(y,m){return new Date(y,m,0).getDate()}
function gen(){ // recorrência sem duplicar
 const [Y,M]=ym.split('-').map(Number);const roots=S.bills.filter(b=>b.tpl===b.id&&b.rec!=='unica');let ch=0;
 roots.forEach(r=>{const [ry,rm,rd]=r.due.split('-').map(Number);if(Y*12+M<ry*12+rm)return;
  const add=due=>{if(!S.bills.some(b=>b.tpl===r.id&&b.due===due)){S.bills.push({...r,id:uid(),due,tpl:r.id,demo:r.demo});ch=1}};
  if(r.rec==='mensal')add(Y+'-'+pad(M)+'-'+pad(Math.min(rd,lastDay(Y,M))));
  else if(r.rec==='anual'){if(M===rm)add(Y+'-'+pad(M)+'-'+pad(Math.min(rd,lastDay(Y,M))))}
  else if(r.rec==='semanal'){const st=new Date(ry,rm-1,rd);for(let x=1;x<=lastDay(Y,M);x++){const dt=new Date(Y,M-1,x);if(dt>=st&&Math.round((dt-st)/864e5)%7===0)add(Y+'-'+pad(M)+'-'+pad(x))}}});
 if(ch)save()}
const credited=b=>S.pays.filter(p=>p.billId===b.id).reduce((a,p)=>a+p.paid-p.fee+p.disc,0);
const paidCash=b=>S.pays.filter(p=>p.billId===b.id).reduce((a,p)=>a+p.paid,0);
const pend=b=>Math.max(0,b.amount-credited(b));
const status=b=>pend(b)===0?'pago':(b.due<today()?'vencido':'pendente');
const monthBills=m=>S.bills.filter(b=>b.due.slice(0,7)===m);
function totals(m){const bs=monthBills(m),bd=S.bud[m]||{init:0,extra:0},avail=bd.init+bd.extra;
 const exp=bs.reduce((a,b)=>a+b.amount,0),paid=bs.reduce((a,b)=>a+paidCash(b),0),pd=bs.reduce((a,b)=>a+pend(b),0),ov=bs.filter(b=>status(b)==='vencido');
 return{bs,bd,avail,exp,paid,pd,ov,ovv:ov.reduce((a,b)=>a+pend(b),0),proj:avail-exp,cur:avail-paid,fees:bs.reduce((a,b)=>a+S.pays.filter(p=>p.billId===b.id).reduce((x,p)=>x+p.fee,0),0)}}
const shiftM=n=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);ym=d.getFullYear()+'-'+pad(d.getMonth()+1);render()};
const mLabel=m=>{const [y,mo]=m.split('-').map(Number);const s=new Date(y,mo-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});return s[0].toUpperCase()+s.slice(1)};
const PG=[['dash','Dashboard'],['bills','Contas do mês'],['cal','Calendário'],['bud','Orçamento'],['rep','Histórico'],['cats','Categorias'],['cfg','Configurações']];
function render(){gen();$('#nav').innerHTML='<h1>🏠 Nossa Casa</h1>'+PG.map(([k,l])=>`<button class="${k===page?'on':''}" onclick="page='${k}';render()">${l}</button>`).join('');
 const hasM=['dash','bills','cal','bud'].includes(page);
 let h=`<div class="top"><h2>${PG.find(x=>x[0]===page)[1]}</h2>${hasM?`<button class="btn" onclick="shiftM(-1)">‹</button><b>${mLabel(ym)}</b><button class="btn" onclick="shiftM(1)">›</button>`:''}<button class="btn" onclick="payModal()">Registrar pagamento</button><button class="btn p" onclick="billModal()">+ Nova conta</button></div>`;
 h+=({dash,bills,cal,bud,rep,cats,cfg})[page]();$('#app').innerHTML=h}
function row(b,acts=true){const s=status(b),t=b.due===today()&&s!=='pago';return`<div class="row"><div class="n"><b>${esc(b.name)}</b> ${b.demo?'<span class="demo">fictício</span>':''}<div class="k">${esc(b.cat)} · vence ${fmtD(b.due)}${t?' · <b class="o">hoje</b>':''} · ${b.rec}</div></div><div style="text-align:right"><b>${brl(b.amount)}</b>${s!=='pago'&&credited(b)>0?`<div class="k">falta ${brl(pend(b))}</div>`:''}</div><span class="tag ${s}">${s}</span>${acts?`<button class="btn s" onclick="payModal('${b.id}')">Pagar</button><button class="btn s" onclick="billModal('${b.id}')">Editar</button><button class="btn s d" onclick="delBill('${b.id}')">Excluir</button>`:''}</div>`}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dash(){const t=totals(ym),pct=t.exp?Math.min(100,t.paid/t.exp*100):0,t0=today();
 const up=t.bs.filter(b=>status(b)!=='pago').sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6);
 let h=t.proj<0?`<div class="alert">⚠️ Despesas previstas (${brl(t.exp)}) maiores que o dinheiro disponível (${brl(t.avail)}). Faltam ${brl(-t.proj)}.</div>`:'';
 h+=`<div class="grid"><div class="card"><div class="k">Saldo disponível p/ contas</div><div class="v">${brl(t.avail)}</div></div><div class="card"><div class="k">Total de despesas</div><div class="v">${brl(t.exp)}</div></div><div class="card"><div class="k">Total pago</div><div class="v g">${brl(t.paid)}</div></div><div class="card"><div class="k">Total pendente</div><div class="v o">${brl(t.pd)}</div></div><div class="card"><div class="k">Vencidas (${t.ov.length})</div><div class="v r">${brl(t.ovv)}</div></div><div class="card"><div class="k">Saldo após as contas</div><div class="v ${t.proj<0?'r':'g'}">${brl(t.proj)}</div></div></div>`;
 h+=`<div class="card"><div class="k">Progresso de pagamento · ${pct.toFixed(0)}%</div><div class="bar"><i style="width:${pct}%"></i></div></div><div class="card"><b>Próximos vencimentos</b>${up.length?up.map(b=>row(b,false)).join(''):'<p class="k">Nenhuma conta pendente neste mês. 🎉</p>'}</div>`;return h}
function bills(){const f=filt,list=monthBills(ym).filter(b=>(!f.q||b.name.toLowerCase().includes(f.q.toLowerCase()))&&(!f.cat||b.cat===f.cat)&&(!f.st||status(b)===f.st)&&(!f.type||b.type===f.type)&&(!f.meth||b.method===f.meth)).sort((a,b)=>a.due.localeCompare(b.due));
 const sel=(k,o,ph)=>`<select onchange="filt.${k}=this.value;render()"><option value="">${ph}</option>${o.map(x=>`<option ${f[k]===(x.v??x)?'selected':''} value="${x.v??x}">${x.l??x}</option>`).join('')}</select>`;
 return`<div class="card"><div class="two" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><input placeholder="Pesquisar…" value="${esc(f.q)}" oninput="filt.q=this.value;clearTimeout(window._t);window._t=setTimeout(()=>{render();const i=document.querySelector('input[placeholder^=Pesq]');i.focus();i.setSelectionRange(99,99)},250)">${sel('cat',allCats(),'Categoria')}${sel('st',['pendente','pago','vencido'],'Status')}${sel('type',['fixa','variável'],'Tipo')}${sel('meth',METH,'Pagamento')}</div></div><div class="card">${list.length?list.map(b=>row(b)).join(''):'<p class="k">Nenhuma conta encontrada. Clique em “+ Nova conta”.</p>'}</div>`}
function cal(){const [Y,M]=ym.split('-').map(Number),first=new Date(Y,M-1,1).getDay(),n=lastDay(Y,M),bs=monthBills(ym);
 let h='<div class="card"><div class="cal">'+['D','S','T','Q','Q','S','S'].map(x=>`<div class="h">${x}</div>`).join('')+'<span></span>'.repeat(0);
 for(let i=0;i<first;i++)h+='<div style="visibility:hidden"></div>';
 for(let d=1;d<=n;d++){const ds=ym+'-'+pad(d),l=bs.filter(b=>b.due===ds);h+=`<div onclick="calSel='${ds}';render()" style="${calSel===ds?'outline:2px solid var(--pr)':''}">${d}<br>${l.map(b=>`<span class="dot" style="background:var(--${status(b)==='pago'?'g':status(b)==='vencido'?'r':'o'})"></span>`).join('')}${l.length>1?`<span class="k">${l.length}</span>`:''}</div>`}
 h+='</div><p class="k"><span class="dot" style="background:var(--g)"></span>paga <span class="dot" style="background:var(--o)"></span>pendente <span class="dot" style="background:var(--r)"></span>vencida</p></div>';
 if(calSel){const l=bs.filter(b=>b.due===calSel);h+=`<div class="card"><b>${fmtD(calSel)}</b>${l.length?l.map(b=>row(b)).join(''):'<p class="k">Sem vencimentos neste dia.</p>'}</div>`}
 return h+`<div class="card"><b>Lista por vencimento</b>${bs.sort((a,b)=>a.due.localeCompare(b.due)).map(b=>row(b,false)).join('')||'<p class="k">Sem contas.</p>'}</div>`}
function bud(){const t=totals(ym),b=t.bd;
 return`<div class="card"><label>Saldo inicial (R$)</label><input id="bi" value="${(b.init/100).toFixed(2).replace('.',',')}"><label>Entradas adicionais (R$)</label><input id="be" value="${(b.extra/100).toFixed(2).replace('.',',')}"><br><br><button class="btn p" onclick="S.bud[ym]={init:toC($('#bi').value),extra:toC($('#be').value)};save();render()">Salvar orçamento</button><p class="k">Este valor é o dinheiro reservado para as contas da casa — não é o saldo bancário real.</p></div>
 ${t.proj<0?`<div class="alert">⚠️ Orçamento insuficiente: faltam ${brl(-t.proj)}.</div>`:''}<div class="grid"><div class="card"><div class="k">Dinheiro disponível</div><div class="v">${brl(t.avail)}</div></div><div class="card"><div class="k">Despesas previstas</div><div class="v">${brl(t.exp)}</div></div><div class="card"><div class="k">Pagas</div><div class="v g">${brl(t.paid)}</div></div><div class="card"><div class="k">Ainda necessário</div><div class="v o">${brl(t.pd)}</div></div><div class="card"><div class="k">Saldo atual</div><div class="v">${brl(t.cur)}</div></div><div class="card"><div class="k">Saldo projetado</div><div class="v ${t.proj<0?'r':'g'}">${brl(t.proj)}</div></div></div>`}
function rep(){const ms=[...new Set([...S.bills.map(b=>b.due.slice(0,7)),ym])].sort(),T=ms.map(m=>({m,...totals(m)})),mx=Math.max(1,...T.map(t=>t.exp));
 const cat={};monthBills(ym).forEach(b=>cat[b.cat]=(cat[b.cat]||0)+b.amount);const ce=Object.entries(cat).sort((a,b)=>b[1]-a[1]),cm=Math.max(1,...ce.map(x=>x[1]));
 const top=[...monthBills(ym)].sort((a,b)=>b.amount-a.amount).slice(0,5);
 return`<div class="card"><b>Despesas por mês</b>${T.map(t=>`<div class="cb"><b>${t.m.split('-').reverse().join('/')}</b><div class="bar"><i style="width:${t.exp/mx*100}%;background:var(--pr)"></i></div><span>${brl(t.exp)}</span></div>`).join('')}</div>
 <div class="card"><b>Por categoria · ${mLabel(ym)}</b>${ce.map(([c,v])=>`<div class="cb"><b>${esc(c)}</b><div class="bar"><i style="width:${v/cm*100}%;background:var(--o)"></i></div><span>${brl(v)}</span></div>`).join('')||'<p class="k">Sem dados.</p>'}</div>
 <div class="card"><b>Contas que mais pesam</b>${top.map(b=>`<div class="row"><span class="n">${esc(b.name)}</span><b>${brl(b.amount)}</b></div>`).join('')}</div>
 <div class="card"><b>Evolução do saldo projetado</b>${T.map(t=>`<div class="row"><span class="n">${t.m.split('-').reverse().join('/')}</span><span class="${t.proj<0?'r':'g'}">${brl(t.proj)}</span></div>`).join('')}<p class="k">Juros e multas em ${mLabel(ym)}: <b>${brl(totals(ym).fees)}</b></p></div>
 <div class="card"><b>Pagamentos realizados</b>${[...S.pays].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{const b=S.bills.find(x=>x.id===p.billId);return`<div class="row"><span class="n">${esc(b?.name||'—')}<div class="k">${fmtD(p.date)} · ${p.method}${p.fee?' · juros/multa '+brl(p.fee):''}${p.disc?' · desconto '+brl(p.disc):''}</div></div><b>${brl(p.paid)}</b></div>`}).join('')||'<p class="k">Nenhum pagamento.</p>'}</div>`}
function cats(){return`<div class="card"><div class="row"><input id="nc" placeholder="Nova categoria"><button class="btn p" onclick="const v=$('#nc').value.trim();if(v&&!allCats().includes(v)){S.cats.push(v);save();render()}">Adicionar</button></div>${allCats().map(c=>`<div class="row"><span class="n">${esc(c)}</span>${S.cats.includes(c)?`<button class="btn s d" onclick="S.cats=S.cats.filter(x=>x!=='${esc(c).replace(/'/g,"\\'")}');save();render()">Remover</button>`:'<span class="k">padrão</span>'}</div>`).join('')}</div>`}
function cfg(){return`<div class="card"><p>Os dados ficam salvos neste navegador (localStorage), numa camada única (<code>load/save</code>) pronta para trocar por Supabase.</p><button class="btn" onclick="rmDemo()">Remover dados fictícios</button> <button class="btn" onclick="document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'">Alternar tema</button> <button class="btn d" onclick="if(confirm('Apagar TODOS os dados?')){localStorage.removeItem('casa-v1');load();render()}">Apagar tudo</button></div>`}
function rmDemo(){if(!confirm('Remover contas e pagamentos fictícios?'))return;S.bills=S.bills.filter(b=>!b.demo);S.pays=S.pays.filter(p=>!p.demo);save();render()}
const close=()=>$('#md').innerHTML='';
const opts=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
function billModal(id){const b=S.bills.find(x=>x.id===id)||{name:'',cat:'Outros',amount:0,due:ym+'-10',type:'fixa',rec:'unica',method:'Pix',notes:''};
 $('#md').innerHTML=`<div class="modal"><div><h3>${id?'Editar':'Nova'} conta</h3><label>Nome</label><input id="f1" value="${esc(b.name)}"><div class="two"><div><label>Categoria</label><select id="f2">${opts(allCats(),b.cat)}</select></div><div><label>Valor previsto (R$)</label><input id="f3" value="${(b.amount/100).toFixed(2).replace('.',',')}"></div><div><label>Vencimento</label><input type="date" id="f4" value="${b.due}"></div><div><label>Tipo</label><select id="f5">${opts(['fixa','variável'],b.type)}</select></div><div><label>Recorrência</label><select id="f6" ${id?'disabled':''}>${opts(['unica','semanal','mensal','anual'],b.rec)}</select></div><div><label>Forma de pagamento</label><select id="f7">${opts(METH,b.method)}</select></div></div><label>Observações</label><textarea id="f8">${esc(b.notes)}</textarea>${id?'<p class="k">A alteração vale só para esta ocorrência.</p>':''}<p id="er" class="r"></p><button class="btn p" onclick="saveBill('${id||''}')">Salvar</button> <button class="btn" onclick="close()">Cancelar</button></div></div>`}
function saveBill(id){const n=$('#f1').value.trim(),a=toC($('#f3').value),d=$('#f4').value;if(!n||a<=0||!d){$('#er').textContent='Informe nome, valor maior que zero e vencimento.';return}
 const o={name:n,cat:$('#f2').value,amount:a,due:d,type:$('#f5').value,method:$('#f7').value,notes:$('#f8').value};
 if(id){Object.assign(S.bills.find(x=>x.id===id),o)}else{const i=uid();S.bills.push({id:i,tpl:i,rec:$('#f6').value,...o})}
 save();close();render()}
function delBill(id){const b=S.bills.find(x=>x.id===id),has=S.pays.some(p=>p.billId===id);if(!confirm(has?'Esta conta já tem pagamentos registrados. Excluir também apaga o histórico. Continuar?':'Excluir esta conta?'))return;
 if(b.tpl===b.id&&b.rec!=='unica'&&S.bills.some(x=>x.tpl===b.id&&x.id!==b.id)){const nx=S.bills.filter(x=>x.tpl===b.id&&x.id!==b.id).sort((a,c)=>a.due.localeCompare(c.due))[0];S.bills.forEach(x=>{if(x.tpl===b.id)x.tpl=nx.id})}
 else if(b.tpl===b.id&&b.rec!=='unica'){/* sem outras ocorrências */}
 S.bills=S.bills.filter(x=>x.id!==id);S.pays=S.pays.filter(p=>p.billId!==id);save();render()}
function payModal(id){const open=monthBills(ym).filter(b=>pend(b)>0);if(!id&&!open.length){alert('Nenhuma conta pendente neste mês.');return}
 const b0=S.bills.find(x=>x.id===id)||open[0];
 $('#md').innerHTML=`<div class="modal"><div><h3>Registrar pagamento</h3><label>Conta</label><select id="p0" onchange="payModal(this.value)">${(id?[b0]:open).concat(id?[]:[]).map(b=>`<option value="${b.id}" ${b.id===b0.id?'selected':''}>${esc(b.name)} – ${brl(pend(b))}</option>`).join('')}</select>
 <div class="two"><div><label>Valor pago (R$)</label><input id="p1" value="${(pend(b0)/100).toFixed(2).replace('.',',')}" oninput="diff()"></div><div><label>Data</label><input type="date" id="p2" value="${today()}"></div><div><label>Juros/multa (R$)</label><input id="p3" value="0" oninput="diff()"></div><div><label>Desconto (R$)</label><input id="p4" value="0" oninput="diff()"></div></div><label>Forma</label><select id="p5">${opts(METH,b0.method)}</select><label>Observações</label><input id="p6"><p id="df" class="k"></p><p id="er" class="r"></p><button class="btn p" onclick="savePay('${b0.id}')">Confirmar</button> <button class="btn" onclick="close()">Cancelar</button></div></div>`;
 window._b=b0;diff()}
function diff(){const b=window._b,c=toC($('#p1').value)-toC($('#p3').value)+toC($('#p4').value),r=pend(b)-c;$('#df').textContent=r>0?`Pagamento parcial: restarão ${brl(r)} pendentes.`:r<0?`Valor ${brl(-r)} acima do previsto.`:'Quita a conta integralmente.'}
function savePay(id){const v=toC($('#p1').value);if(v<=0){$('#er').textContent='Informe um valor pago maior que zero.';return}
 S.pays.push({id:uid(),billId:id,paid:v,fee:toC($('#p3').value),disc:toC($('#p4').value),date:$('#p2').value||today(),method:$('#p5').value,notes:$('#p6').value});save();close();render()}
load();render();