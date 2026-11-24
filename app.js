const DB_KEY="etudier-v1";
const ROUTINE_SCHEMA=3;
const DAY_KEYS=["seg","ter","qua","qui","sex","sab","dom"];
const DAY_NAMES={seg:"Segunda",ter:"Terça",qua:"Quarta",qui:"Quinta",sex:"Sexta",sab:"Sábado",dom:"Domingo"};
let db=load();
let page="overview";
const app=document.getElementById("app");
let selectedWeekStart=sessionStorage.getItem("etudier-selected-week")||getMonday(new Date());
selectedWeekStart=getMonday(selectedWeekStart);
let selectedDay=sessionStorage.getItem("etudier-selected-day")||getCurrentDayKey();

function load(){
  try{
    const data=JSON.parse(localStorage.getItem(DB_KEY));
    if(!data)return {tasks:[],commitments:[],work:[],classes:[],recurring:[],routine:[],routineHistory:[],unscheduled:[],routineSchema:ROUTINE_SCHEMA};
    if(data.routineSchema!=ROUTINE_SCHEMA){
      data.routine=[];
      data.unscheduled=[];
      data.routineHistory=[];
      data.routineSchema=ROUTINE_SCHEMA;
    }
    return data;
  }catch{return {tasks:[],commitments:[],work:[],classes:[],recurring:[],routine:[],routineHistory:[],unscheduled:[],routineSchema:ROUTINE_SCHEMA};}
}
function save(){db.routineSchema=ROUTINE_SCHEMA;localStorage.setItem(DB_KEY,JSON.stringify(db));}
function invalidateRoutineSnapshots(){
  db.routine=[];
  db.unscheduled=[];
  db.routineHistory=[];
  save();
}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function mins(t){const[a,b]=String(t||"0:0").split(":").map(Number);return a*60+b;}
function clock(m){m=((m%1440)+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;}
function dateObj(v){return v?new Date(`${v}T12:00:00`):null;}
function formatDate(v){return dateObj(v)?.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})||"Sem prazo";}
function toast(text){const el=document.createElement("div");el.className="toast";el.textContent=text;document.getElementById("toastStack").appendChild(el);setTimeout(()=>el.remove(),3200);}
function nextDay(day){return DAY_KEYS[(DAY_KEYS.indexOf(day)+1)%7];}
function monthlyWorkDays(record){
  return record.days?.length?record.days:DAY_KEYS.slice(0,6);
}
function isOverdue(task){return task.status!="concluida"&&task.deadline&&dateObj(task.deadline)<new Date(new Date().setHours(0,0,0,0));}
function getMonday(date){
  const result=new Date(typeof date=="string"?`${date.slice(0,10)}T12:00:00`:date);
  result.setHours(12,0,0,0);
  const offset=(result.getDay()+6)%7;
  result.setDate(result.getDate()-offset);
  return formatLocalDate(result);
}
function formatLocalDate(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function getCurrentDayKey(){
  const js=new Date().getDay();
  return DAY_KEYS[(js+6)%7];
}
function shiftWeek(weekStart,days){
  const date=new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate()+days);
  return formatLocalDate(date);
}
function addDays(dateString,days){
  const date=new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate()+days);
  return formatLocalDate(date);
}
function dateToDayKey(dateString){
  const js=new Date(`${dateString}T12:00:00`).getDay();
  return DAY_KEYS[(js+6)%7];
}

function heading(title,subtitle,buttonLabel,buttonAction){
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${buttonLabel?`<button class="button" id="pageAction">${buttonLabel}</button>`:""}</div>`;
}
function bindHeading(action){const el=document.getElementById("pageAction");if(el)el.onclick=action;}
function navigate(target){page=target;document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===target));document.getElementById("sidebar").classList.remove("open");render();window.scrollTo({top:0,behavior:"smooth"});}

function render(){
  ({overview:renderOverview,routine:renderRoutine,tasks:renderTasks,commitments:()=>renderSimple("commitment"),work:()=>renderSimple("work"),classes:()=>renderSimple("classes"),recurring:()=>renderSimple("recurring")})[page]();
}

function renderOverview(){
  const pending=db.tasks.filter(t=>t.status!="concluida");
  const completed=db.tasks.filter(t=>t.status=="concluida");
  const sorted=[...pending].sort((a,b)=>{
    if(a.deadline&&b.deadline&&a.deadline!=b.deadline)return a.deadline.localeCompare(b.deadline);
    if(a.deadline&&!b.deadline)return -1;if(!a.deadline&&b.deadline)return 1;
    return {alta:0,media:1,baixa:2}[a.priority]-({alta:0,media:1,baixa:2}[b.priority]);
  });
  const today=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  app.innerHTML=heading("Olá!",today,"+ Nova tarefa",()=>openTaskModal())+
  `<div class="stats"><div class="stat-card"><div class="stat-label">Tarefas pendentes</div><div class="stat-value">${pending.length}</div><div class="stat-detail">Aguardando organização</div></div>
  <div class="stat-card"><div class="stat-label">Concluídas</div><div class="stat-value">${completed.length}</div><div class="stat-detail">Entregas finalizadas</div></div>
  <div class="stat-card"><div class="stat-label">Compromissos</div><div class="stat-value">${db.commitments.length}</div><div class="stat-detail">Horários fixos</div></div>
  <div class="stat-card"><div class="stat-label">Próximos prazos</div><div class="stat-value">${pending.filter(t=>t.deadline).length}</div><div class="stat-detail">Com prazo definido</div></div></div>
  <div class="dashboard"><div class="card"><div class="card-header"><h2>Próximas entregas</h2><button class="button secondary small" id="viewTasks">Ver todas</button></div><div class="card-body">${sorted.slice(0,5).map(taskOverview).join("")||`<div class="empty">Nenhuma tarefa pendente.<br>Cadastre sua primeira atividade.</div>`}</div></div>
  <div class="card"><div class="card-header"><h2>Ações rápidas</h2></div><div class="card-body"><div class="quick-row"><span class="task-marker" style="background:var(--violet)"></span><div class="task-info"><strong>Gerar minha rotina</strong><span>Encontrar horários livres</span></div><button class="button small" id="generateQuick">Gerar</button></div><div class="quick-row"><span class="task-marker" style="background:var(--green)"></span><div class="task-info"><strong>Novo compromisso</strong><span>Bloquear um horário</span></div><button class="button small secondary" id="addQuick">Adicionar</button></div></div></div></div>`;
  bindHeading(()=>openTaskModal());
  document.getElementById("viewTasks").onclick=()=>navigate("tasks");
  document.getElementById("generateQuick").onclick=generateRoutine;
  document.getElementById("addQuick").onclick=()=>openCommitmentModal();
}
function taskOverview(t){
  const color=isOverdue(t)? "var(--red)":t.priority=="alta"?"var(--orange)":t.priority=="media"?"var(--violet)":"var(--green)";
  return `<div class="task-row"><span class="task-marker" style="background:${color}"></span><div class="task-info"><strong>${esc(t.name)}</strong><span>${esc(t.category)} • ${formatDate(t.deadline)}${isOverdue(t)?" • atrasada":""}</span></div><span class="badge ${t.status}">${({pendente:"Pendente",andamento:"Em andamento",concluida:"Concluída"})[t.status]}</span></div>`;
}

function renderTasks(){
  app.innerHTML=heading("Tarefas","Acadêmicas, profissionais e pessoais","+ Nova tarefa",()=>openTaskModal())+
  `<div class="card table-card"><table class="data-table"><thead><tr><th>Tarefa</th><th>Categoria</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th></th></tr></thead><tbody>${db.tasks.length?db.tasks.map(t=>`<tr><td><strong>${esc(t.name)}</strong><br><span style="color:var(--muted)">${esc(t.description||"")}</span></td><td>${esc(t.category)}</td><td class="${isOverdue(t)?"overdue":""}">${formatDate(t.deadline)}</td><td><span class="priority priority-${t.priority}">● ${esc(t.priority)}</span></td><td><select class="status-select" data-status="${t.id}"><option value="pendente"${t.status=="pendente"?" selected":""}>Pendente</option><option value="andamento"${t.status=="andamento"?" selected":""}>Em andamento</option><option value="concluida"${t.status=="concluida"?" selected":""}>Concluída</option></select></td><td><div class="actions"><button class="icon-action" data-edit-task="${t.id}" aria-label="Editar">✎</button><button class="icon-action delete" data-delete-task="${t.id}" aria-label="Excluir">×</button></div></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty">Nenhuma tarefa cadastrada.</div></td></tr>`}</tbody></table></div>`;
  bindHeading(()=>openTaskModal());
  document.querySelectorAll("[data-status]").forEach(el=>el.onchange=()=>{db.tasks.find(t=>t.id==el.dataset.status).status=el.value;invalidateRoutineSnapshots();render();toast("Status atualizado");});
  bindRows("task");
}

const sections={
  commitment:{title:"Compromissos",subtitle:"Horários fixos que tornam períodos indisponíveis",button:"Novo compromisso",open:openCommitmentModal},
  work:{title:"Escala de trabalho",subtitle:"Cadastre turnos em datas específicas",button:"Novo turno",open:openWorkModal},
  classes:{title:"Horários das aulas",subtitle:"Disciplinas e seus deslocamentos",button:"Nova disciplina",open:openClassModal},
  recurring:{title:"Atividades recorrentes",subtitle:"Hábitos e estudos que se repetem",button:"Nova atividade",open:openRecurringModal}
};
function renderSimple(type){
  const s=sections[type];
  const collection=crudCollection(type);
  app.innerHTML=heading(s.title,s.subtitle,s.button,s.open)+`<div class="card table-card"><table class="data-table"><thead><tr><th>${type=="classes"?"Disciplina":"Atividade / turno"}</th><th>Dia / horário</th><th>Detalhes</th><th></th></tr></thead><tbody>${collection.length?collection.map(r=>{
    let schedule;
    if(type=="work"&&r.recurrence=="semanal") schedule=`Semanal • ${(r.days||[]).map(d=>DAY_NAMES[d]).join(", ")} • ${r.start}–${r.end}`;
    else if(type=="work"&&r.recurrence=="mensal") schedule=`Mensal • ${monthlyWorkDays(r).map(d=>DAY_NAMES[d]).join(", ")} • ${formatDate(r.date)}${r.endDate?`–${formatDate(r.endDate)}`:" em diante"} • ${r.start}–${r.end}`;
    else if(r.date) schedule=`${formatDate(r.date)} • ${r.start}–${r.end}`;
    else if(r.day) schedule=`${DAY_NAMES[r.day]} • ${r.start}–${r.end}`;
    else if(type=="commitment") schedule=`${(r.days||[]).map(d=>DAY_NAMES[d]).join(", ")} • ${r.start}–${r.end}`;
    else schedule=`${(r.days||[]).map(d=>DAY_NAMES[d]).join(", ")} • ${r.start||"Horário livre"} • ${r.duration||""} min`;
    let detail=r.location||r.category|| (r.travel!=null?`${r.travel} min de deslocamento`:"");
    return `<tr><td><strong>${esc(r.name)}</strong><br><span style="color:var(--muted)">${esc(r.description||"")}</span></td><td>${esc(schedule)}</td><td>${esc(detail)}</td><td><div class="actions"><button class="icon-action" data-edit-${type}="${r.id}">✎</button><button class="icon-action delete" data-delete-${type}="${r.id}">×</button></div></td></tr>`;
  }).join(""):`<tr><td colspan="4"><div class="empty">Nada cadastrado ainda.</div></td></tr>`}</tbody></table></div>`;
  bindHeading(()=>s.open());bindRows(type);
}

function bindRows(type){
  const editKey=`edit${type[0].toUpperCase()+type.slice(1)}`;
  document.querySelectorAll(`[data-edit-${type}]`).forEach(el=>el.onclick=()=>openEdit(type,el.dataset[editKey]));
  document.querySelectorAll(`[data-delete-${type}]`).forEach(el=>el.onclick=()=>{
    if(!confirm("Excluir este registro permanentemente?"))return;
    const key=`delete${type[0].toUpperCase()+type.slice(1)}`, recordId=el.dataset[key];
    const collection=crudCollection(type);
    const index=collection.findIndex(r=>r.id==recordId);
    if(index>=0)collection.splice(index,1);
    invalidateRoutineSnapshots();render();toast("Registro excluído");
  });
  if(type=="task"){
    document.querySelectorAll("[data-edit-task]").forEach(el=>el.onclick=()=>openTaskModal(db.tasks.find(t=>t.id==el.dataset.editTask)));
  }
}
function openEdit(type,recordId){
  const item=crudCollection(type).find(r=>r.id==recordId);
  ({commitment:openCommitmentModal,work:openWorkModal,classes:openClassModal,recurring:openRecurringModal})[type](item);
}

function crudCollection(type){
  return db[type=="commitment"?"commitments":type=="task"?"tasks":type];
}

function openModal(title,body){
  document.getElementById("modalTitle").textContent=title;
  document.getElementById("modalBody").innerHTML=body;
  document.getElementById("modalBackdrop").hidden=false;
}
function closeModal(){document.getElementById("modalBackdrop").hidden=true;}
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("modalBackdrop").onclick=e=>{if(e.target.id=="modalBackdrop")closeModal();};

function dayChecks(selected=[]){
  return `<div class="day-checks">${DAY_KEYS.map(d=>`<label class="day-check"><input type="checkbox" name="days" value="${d}"${selected.includes(d)?" checked":""}> ${DAY_NAMES[d]}</label>`).join("")}</div>`;
}
function cancelButton(){return `<button type="button" class="button secondary" id="cancelModal">Cancelar</button>`;}

function openTaskModal(item){
  openModal(item?"Editar tarefa":"Nova tarefa",`<form id="taskForm" class="form-grid">
  <div class="field full"><label>Nome da tarefa *</label><input name="name" required value="${esc(item?.name||"")}"></div>
  <div class="field full"><label>Descrição</label><textarea name="description">${esc(item?.description||"")}</textarea></div>
  <div class="field"><label>Categoria *</label><select name="category" required><option${item?.category=="Acadêmica"? " selected":""}>Acadêmica</option><option${item?.category=="Profissional"? " selected":""}>Profissional</option><option${item?.category=="Pessoal"? " selected":""}>Pessoal</option><option${item?.category=="Outra"? " selected":""}>Outra</option></select></div>
  <div class="field"><label>Data de início</label><input type="date" name="startDate" value="${esc(item?.startDate||"")}"></div>
  <div class="field"><label>Prazo de entrega</label><input type="date" name="deadline" value="${esc(item?.deadline||"")}"></div>
  <div class="field"><label>Tempo estimado (min) *</label><input type="number" name="duration" min="15" step="15" required value="${esc(item?.duration||60)}"></div>
  <div class="field"><label>Prioridade</label><select name="priority"><option value="baixa"${item?.priority=="baixa"?" selected":""}>Baixa</option><option value="media"${item?.priority=="media"?" selected":""}>Média</option><option value="alta"${item?.priority=="alta"?" selected":""}>Alta</option></select></div>
  <div class="field"><label>Status</label><select name="status"><option value="pendente"${item?.status=="pendente"?" selected":""}>Pendente</option><option value="andamento"${item?.status=="andamento"?" selected":""}>Em andamento</option><option value="concluida"${item?.status=="concluida"?" selected":""}>Concluída</option></select></div>
  <div class="form-actions">${cancelButton()}<button class="button">Salvar tarefa</button></div></form>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("taskForm").onsubmit=e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
    if(item)Object.assign(item,data);else db.tasks.push({id:id(),...data});
    invalidateRoutineSnapshots();closeModal();render();toast("Tarefa salva");
  };
}
function openCommitmentModal(item){
  openModal(item?"Editar compromisso":"Novo compromisso",`<form id="commitmentForm" class="form-grid">
  <div class="field full"><label>Nome *</label><input name="name" required value="${esc(item?.name||"")}"></div>
  <div class="field full"><label>Descrição</label><textarea name="description">${esc(item?.description||"")}</textarea></div>
  <div class="field full"><label>Dias da semana *</label>${dayChecks(item?.days||[])}</div>
  <div class="field"><label>Horário inicial *</label><input type="time" name="start" required value="${esc(item?.start||"09:00")}"></div>
  <div class="field"><label>Horário final *</label><input type="time" name="end" required value="${esc(item?.end||"10:00")}"></div>
  <div class="field full"><label>Categoria</label><select name="category"><option${item?.category=="Pessoal"?" selected":""}>Pessoal</option><option${item?.category=="Acadêmica"?" selected":""}>Acadêmica</option><option${item?.category=="Profissional"?" selected":""}>Profissional</option><option${item?.category=="Outro"?" selected":""}>Outro</option></select></div>
  <div class="form-actions">${cancelButton()}<button class="button">Salvar compromisso</button></div></form>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("commitmentForm").onsubmit=e=>{
    e.preventDefault();const form=new FormData(e.target),data=Object.fromEntries(form);data.days=form.getAll("days");
    if(!data.days.length)return toast("Selecione pelo menos um dia");
    if(mins(data.start)==mins(data.end))return toast("Horários devem ser diferentes");
    if(hasFixedConflict(db.commitments,data,item?.id))return toast("Existe conflito com outro compromisso");
    if(item)Object.assign(item,data);else db.commitments.push({id:id(),...data});invalidateRoutineSnapshots();closeModal();render();toast("Compromisso salvo");
  };
}
function openWorkModal(item){
  const selectedDays=item?.days?.length?item.days:item?.recurrence=="mensal"?DAY_KEYS.slice(0,6):[];
  openModal(item?"Editar turno":"Novo turno",`<form id="workForm" class="form-grid">
  <div class="field full"><label>Identificação do turno *</label><input name="name" required value="${esc(item?.name||"")}"></div>
  <div class="field"><label>Recorrência *</label><select name="recurrence"><option value="unica"${item?.recurrence=="unica"?" selected":""}>Dia único</option><option value="semanal"${item?.recurrence=="semanal"?" selected":""}>Semanal</option><option value="mensal"${item?.recurrence=="mensal"?" selected":""}>Mensal</option></select></div>
  <div class="field"><label>Data inicial *</label><input type="date" name="date" required value="${esc(item?.date||"")}"></div>
  <div class="field full"><label>Dias da semana (repetição semanal ou mensal)</label>${dayChecks(selectedDays)}</div>
  <div class="field"><label>Data final (opcional)</label><input type="date" name="endDate" value="${esc(item?.endDate||"")}"></div>
  <div class="field"><label>Local</label><input name="location" value="${esc(item?.location||"")}"></div>
  <div class="field"><label>Horário inicial *</label><input type="time" name="start" required value="${esc(item?.start||"08:00")}"></div>
  <div class="field"><label>Horário final *</label><input type="time" name="end" required value="${esc(item?.end||"17:00")}"></div>
  <div class="field"><label>Intervalo (min)</label><input type="number" name="break" min="0" value="${esc(item?.break||0)}"></div>
  <div class="field"><label>Deslocamento (min)</label><input type="number" name="travel" min="0" value="${esc(item?.travel||0)}"></div>
  <div class="form-actions">${cancelButton()}<button class="button">Salvar turno</button></div></form>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.querySelector('#workForm select[name="recurrence"]').onchange=e=>{
    if(e.target.value=="mensal"&&!document.querySelectorAll('#workForm input[name="days"]:checked').length){
      document.querySelectorAll('#workForm input[name="days"]').forEach((input,index)=>input.checked=index<6);
    }
  };
  document.getElementById("workForm").onsubmit=e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
    data.days=new FormData(e.target).getAll("days");
    if(mins(data.start)==mins(data.end))return toast("Horários devem ser diferentes");
    if(["semanal","mensal"].includes(data.recurrence)&&!data.days.length)return toast("Selecione pelo menos um dia para a escala");
    if(data.endDate&&data.endDate<data.date)return toast("A data final deve ser posterior à data inicial");
    if(item)Object.assign(item,data);else db.work.push({id:id(),...data});invalidateRoutineSnapshots();closeModal();render();toast("Turno salvo");
  };
}
function openClassModal(item){
  openModal(item?"Editar disciplina":"Nova disciplina",`<form id="classForm" class="form-grid">
  <div class="field full"><label>Disciplina *</label><input name="name" required value="${esc(item?.name||"")}"></div>
  <div class="field"><label>Dia da semana *</label><select name="day">${DAY_KEYS.map(d=>`<option value="${d}"${item?.day==d?" selected":""}>${DAY_NAMES[d]}</option>`).join("")}</select></div>
  <div class="field"><label>Local</label><input name="location" value="${esc(item?.location||"")}"></div>
  <div class="field"><label>Horário inicial *</label><input type="time" name="start" required value="${esc(item?.start||"08:00")}"></div>
  <div class="field"><label>Horário final *</label><input type="time" name="end" required value="${esc(item?.end||"09:30")}"></div>
  <div class="form-actions">${cancelButton()}<button class="button">Salvar disciplina</button></div></form>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("classForm").onsubmit=e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
    if(mins(data.start)==mins(data.end))return toast("Horários devem ser diferentes");
    if(item)Object.assign(item,data);else db.classes.push({id:id(),...data});invalidateRoutineSnapshots();closeModal();render();toast("Disciplina salva");
  };
}
function openRecurringModal(item){
  openModal(item?"Editar atividade recorrente":"Nova atividade recorrente",`<form id="recurringForm" class="form-grid">
  <div class="field full"><label>Nome da atividade *</label><input name="name" required value="${esc(item?.name||"")}"></div>
  <div class="field full"><label>Descrição</label><textarea name="description">${esc(item?.description||"")}</textarea></div>
  <div class="field full"><label>Dias da semana *</label>${dayChecks(item?.days||[])}</div>
  <div class="field"><label>Horário inicial</label><input type="time" name="start" value="${esc(item?.start||"19:00")}"></div>
  <div class="field"><label>Duração (min) *</label><input type="number" name="duration" min="15" step="15" required value="${esc(item?.duration||60)}"></div>
  <div class="field"><label>Categoria</label><select name="category"><option${item?.category=="Pessoal"?" selected":""}>Pessoal</option><option${item?.category=="Acadêmica"?" selected":""}>Acadêmica</option><option${item?.category=="Profissional"?" selected":""}>Profissional</option><option${item?.category=="Outra"?" selected":""}>Outra</option></select></div>
  <div class="field"><label>Frequência</label><select name="frequency"><option value="semanal"${item?.frequency=="semanal"?" selected":""}>Semanal</option><option value="quinzenal"${item?.frequency=="quinzenal"?" selected":""}>Quinzenal</option></select></div>
  <div class="field"><label>Início</label><input type="date" name="startDate" value="${esc(item?.startDate||"")}"></div>
  <div class="field"><label>Encerramento</label><input type="date" name="endDate" value="${esc(item?.endDate||"")}"></div>
  <div class="form-actions">${cancelButton()}<button class="button">Salvar atividade</button></div></form>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("recurringForm").onsubmit=e=>{
    e.preventDefault();const form=new FormData(e.target),data=Object.fromEntries(form);data.days=form.getAll("days");
    if(!data.days.length)return toast("Selecione pelo menos um dia");
    if(item)Object.assign(item,data);else db.recurring.push({id:id(),...data});invalidateRoutineSnapshots();closeModal();render();toast("Atividade salva");
  };
}

function rangesOverlap(a,b){
  let aStart=mins(a.start),aEnd=mins(a.end),bStart=mins(b.start),bEnd=mins(b.end);
  if(aEnd<aStart)aEnd+=1440;if(bEnd<bStart)bEnd+=1440;
  return aStart<bEnd&&bStart<aEnd;
}
function hasFixedConflict(records,item,excludeId){
  return records.some(r=>{
    if(r.id==excludeId)return false;
    if(item.days&&r.days&&!r.days.some(d=>item.days.includes(d)))return false;
    return rangesOverlap(r,item);
  });
}

function renderRoutine(){
  app.innerHTML=heading("Minha rotina","Visão semanal baseada nos horários cadastrados","Gerar rotina",generateRoutine)+
  `<div class="toolbar routine-toolbar">
    <div class="toolbar-navigation">
      <button class="button secondary small" id="previousWeek" aria-label="Semana anterior">‹</button>
      <div class="field compact"><label for="weekPicker">Semana</label><input type="date" id="weekPicker" value="${esc(selectedWeekStart)}"></div>
      <button class="button secondary small" id="nextWeek" aria-label="Próxima semana">›</button>
    </div>
    <div class="field compact day-picker"><label for="dayPicker">Visualizar dia</label><select id="dayPicker"><option value=""${selectedDay==""?" selected":""}>Todos os dias</option>${DAY_KEYS.map(d=>`<option value="${d}"${selectedDay==d?" selected":""}>${DAY_NAMES[d]}</option>`).join("")}</select></div>
  </div><div class="week-wrap" id="routineContainer"></div><div id="unscheduledContainer"></div>`;
  bindHeading(generateRoutine);
  document.getElementById("previousWeek").onclick=()=>{selectedWeekStart=shiftWeek(selectedWeekStart,-7);sessionStorage.setItem("etudier-selected-week",selectedWeekStart);renderRoutine();};
  document.getElementById("nextWeek").onclick=()=>{selectedWeekStart=shiftWeek(selectedWeekStart,+7);sessionStorage.setItem("etudier-selected-week",selectedWeekStart);renderRoutine();};
  document.getElementById("weekPicker").onchange=e=>{if(e.target.value){selectedWeekStart=getMonday(e.target.value);sessionStorage.setItem("etudier-selected-week",selectedWeekStart);renderRoutine();}};
  document.getElementById("dayPicker").onchange=e=>{selectedDay=e.target.value;sessionStorage.setItem("etudier-selected-day",selectedDay);drawWeek(selectedDay||null);};
  drawWeek(selectedDay);
}
function drawWeek(selectedDay){
  const visible=selectedDay?[selectedDay]:DAY_KEYS;
  db.routineHistory=db.routineHistory||[];
  let snapshot=db.routineHistory.find(r=>r.weekStart==selectedWeekStart);
  const routine=snapshot?.routine||[];
  const unscheduled=snapshot?.unscheduled||[];
  let html=`<div class="week-grid" style="grid-template-columns:68px repeat(${visible.length},minmax(130px,1fr))"><div class="week-header"></div>${visible.map(d=>{
    const offset=DAY_KEYS.indexOf(d);
    const date=new Date(`${selectedWeekStart}T12:00:00`);
    date.setDate(date.getDate()+offset);
    return `<div class="week-header">${DAY_NAMES[d]}<br><small>${date.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</small></div>`;
  }).join("")}`;
  for(let h=6;h<24;h++){
    html+=`<div class="time-label">${String(h).padStart(2,"0")}:00</div>`;
    visible.forEach(d=>html+=`<div class="day-cell" data-day="${d}" data-hour="${h}"></div>`);
  }
  html+="</div>";
  if(!snapshot)html+=`<div class="empty routine-empty">Nenhuma rotina gerada para esta semana.</div>`;
  document.getElementById("routineContainer").innerHTML=html;
  const colors={work:"var(--blue)",class:"var(--violet)",commitment:"var(--orange)",task:"var(--green)",recurring:"#9a72be",travel:"#9aa3b3"};
  routine.forEach(r=>{
    if(!visible.includes(r.day)||r.start>=1440||r.end<=360)return;
    const hour=Math.floor(r.start/60);
    const cell=document.querySelector(`.day-cell[data-day="${r.day}"][data-hour="${hour}"]`);
    if(!cell)return;
    const top=((r.start-hour*60)/60)*64,height=Math.max(24,(r.end-r.start)/60*64-3);
    const block=document.createElement("div");
    block.className="routine-block";
    block.style.cssText=`top:${top}px;height:${height}px;background:${colors[r.type]||"var(--violet)"}`;
    block.innerHTML=`<strong>${esc(r.name)}</strong><span>${clock(r.start)}–${clock(r.end)}</span>`;
    cell.appendChild(block);
  });
  if(unscheduled.length){
    document.getElementById("unscheduledContainer").innerHTML=`<div class="card" style="margin-top:16px"><div class="card-header"><h2>Tarefas não encaixadas</h2></div><div class="card-body">${unscheduled.map(name=>`<div class="task-row"><span class="task-marker" style="background:var(--red)"></span><div class="task-info"><strong>${esc(name)}</strong><span>Não há tempo suficiente nesta semana</span></div></div>`).join("")}</div></div>`;
  }else document.getElementById("unscheduledContainer").innerHTML="";
}

// A agenda fixa vira uma lista de intervalos ocupados por dia.
// Tarefas são distribuídas nos primeiros intervalos livres, após 7h, em ordem de prazo/prioridade.
function generateRoutine(){
  const weekStart=getMonday(selectedWeekStart);
  const weekEnd=addDays(weekStart,6);
  selectedWeekStart=weekStart;
  const occupied={};DAY_KEYS.forEach(d=>occupied[d]=[]);
  const routine=[];
  db.commitments.forEach(r=>{
    (r.days||[]).forEach(day=>{
      let start=mins(r.start),end=mins(r.end);
      if(end<start){occupied[day].push({start,end:1440});occupied[nextDay(day)].push({start:0,end});}
      else occupied[day].push({start,end});
      routine.push({day,start,end:end<start?1440:end,name:r.name,type:"commitment"});
    });
  });
  // Aulas são informações cadastrais separadas e não ocupam/entram na rotina automática.
  // Use compromissos para bloquear o período da faculdade na agenda.
  db.work.forEach(r=>{
    if(!r.date)return;
    const recurrence=r.recurrence||"unica";
    let workDays=[];
    if(recurrence=="semanal"){
      if(r.date>weekEnd)return;
      if(r.endDate&&r.endDate<weekStart)return;
      workDays=(r.days||[]).filter(day=>{
        const dateForDay=addDays(weekStart,DAY_KEYS.indexOf(day));
        return dateForDay>=r.date&&(!r.endDate||dateForDay<=r.endDate);
      });
    }else if(recurrence=="mensal"){
      const startDate=String(r.date).slice(0,10);
      const endDate=r.endDate?String(r.endDate).slice(0,10):"";
      if(startDate>weekEnd||endDate&&endDate<weekStart)return;
      workDays=monthlyWorkDays(r).filter(day=>{
        const occurrenceDate=addDays(weekStart,DAY_KEYS.indexOf(day));
        return occurrenceDate>=startDate&&(!endDate||occurrenceDate<=endDate);
      });
    }else{
      if(r.date>=weekStart&&r.date<=weekEnd){
        workDays=[dateToDayKey(r.date)];
      }
    }
    const start=mins(r.start),end=mins(r.end),travel=Number(r.travel||0);
    workDays.forEach(day=>{
      if(travel>0){
        occupied[day].push({start:Math.max(360,start-travel),end:start});
        routine.push({day,start:Math.max(360,start-travel),end:start,name:`Deslocamento • ${r.name}`,type:"travel"});
      }
      if(end<start){occupied[day].push({start,end:1440});occupied[nextDay(day)].push({start:0,end});}
      else occupied[day].push({start,end});
      routine.push({day,start,end:end<start?1440:end,name:r.name,type:"work"});
    });
  });
  db.recurring.forEach(r=>{
    (r.days||[]).forEach(day=>{
      if(!r.start)return;
      const start=mins(r.start),end=Math.min(1440,start+Number(r.duration||60));
      occupied[day].push({start,end});
      routine.push({day,start,end,name:r.name,type:"recurring"});
    });
  });
  const priority={alta:0,media:1,baixa:2};
  const tasks=[...db.tasks].filter(t=>t.status!="concluida").sort((a,b)=>{
    if(a.deadline&&b.deadline&&a.deadline!=b.deadline)return a.deadline.localeCompare(b.deadline);
    if(a.deadline&&!b.deadline)return -1;if(!a.deadline&&b.deadline)return 1;
    return (priority[a.priority]??2)-(priority[b.priority]??2);
  });
  const unscheduled=[];
  tasks.forEach(task=>{
    const duration=Math.max(15,Number(task.duration||60));let remaining=duration,placed=false;
    for(const day of DAY_KEYS){
      if(placed)break;
      const intervals=occupied[day].filter(x=>x.end>420).sort((a,b)=>a.start-b.start);
      let cursor=420;
      for(const block of intervals){
        if(cursor+remaining<=block.start){
          routine.push({day,start:cursor,end:cursor+remaining,name:task.name,type:"task"});
          occupied[day].push({start:cursor,end:cursor+remaining});placed=true;break;
        }
        cursor=Math.max(cursor,block.end);
      }
      if(!placed&&cursor+remaining<=1440){
        routine.push({day,start:cursor,end:cursor+remaining,name:task.name,type:"task"});
        occupied[day].push({start:cursor,end:cursor+remaining});placed=true;
      }
    }
    if(!placed)unscheduled.push(task.name);
  });
  db.routine=routine;
  db.unscheduled=unscheduled;
  db.routineHistory=db.routineHistory||[];
  db.routineHistory=db.routineHistory.filter(r=>r.weekStart!=selectedWeekStart);
  db.routineHistory.push({weekStart:selectedWeekStart,routine:routine.map(r=>({...r})),unscheduled:[...unscheduled],generatedAt:new Date().toISOString()});
  selectedDay="";
  sessionStorage.setItem("etudier-selected-day",selectedDay);
  save();navigate("routine");
  toast(unscheduled.length?`${unscheduled.length} tarefa(s) não encaixada(s)`: "Rotina gerada sem conflitos");
}

document.querySelectorAll(".nav-item").forEach(el=>el.onclick=()=>navigate(el.dataset.page));
document.querySelector(".brand").onclick=e=>{e.preventDefault();navigate("overview");};
document.getElementById("menuButton").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("notificationButton").onclick=()=>toast(db.unscheduled?.length?`${db.unscheduled.length} tarefa(s) não encaixadas`:"Sem novas notificações");
render();
