(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.TENDER_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  let client = null, tenders = [], profitChart = null, annualChart = null, activeView = "dashboard";
  const money = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(n)||0) + " сум";
  const num = id => Number($(id).value || 0);
  const dateNow = () => new Date().toISOString().slice(0,10);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const statusText = s => ({pending:"Ожидается",partial:"Частично",paid:"Оплачено"}[s]||s);
  const profitOf = t => Number(t.lot_amount)-Number(t.tax)-Number(t.cost_price)-Number(t.extra_expenses);
  const toast = msg => { $("toast").textContent=msg; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"),2600); };
  const setSync = (ok,msg) => { $("syncLabel").textContent=msg; $("syncLabel").parentElement.classList.toggle("online",!!ok); };
  function showView(view) {
    activeView=view;
    document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));
    $(view+"View").classList.remove("hidden");
    document.querySelectorAll(".nav-link[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
    $("pageTitle").textContent=({dashboard:"Обзор",tenders:"Тендеры",analytics:"Аналитика"})[view];
    if(view==="analytics") renderAnalytics();
  }
  function sorted(list=tenders){return [...list].sort((a,b)=>b.tender_date.localeCompare(a.tender_date)||b.created_at.localeCompare(a.created_at));}
  function fillYears(){
    const years=[...new Set([new Date().getFullYear(),...tenders.map(t=>new Date(t.tender_date+"T00:00:00").getFullYear())])].sort((a,b)=>b-a);
    ["chartYear","analyticsYear"].forEach(id=>{const el=$(id),prev=el.value;el.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join("");if(years.includes(Number(prev)))el.value=prev;});
  }
  function yearList(y){return tenders.filter(t=>new Date(t.tender_date+"T00:00:00").getFullYear()===Number(y));}
  function totals(list){return list.reduce((a,t)=>{a.amount+=Number(t.lot_amount);a.tax+=Number(t.tax);a.cost+=Number(t.cost_price);a.extra+=Number(t.extra_expenses);a.profit+=profitOf(t);return a;},{amount:0,tax:0,cost:0,extra:0,profit:0});}
  function renderDashboard(){
    const all=totals(tenders),costs=all.tax+all.cost+all.extra;
    $("totalAmount").textContent=money(all.amount);$("totalProfit").textContent=money(all.profit);$("totalCosts").textContent=money(costs);$("totalCount").textContent=tenders.length;
    const y=yearList(new Date().getFullYear()),yt=totals(y);
    $("avgProfit").textContent=money(y.length?yt.profit/y.length:0);$("margin").textContent=(yt.amount?yt.profit/yt.amount*100:0).toFixed(1)+"%";
    $("pendingCount").textContent=y.filter(t=>t.payment_status==="pending").length;
    $("paidCount").textContent=y.filter(t=>t.payment_status==="paid").length;
    $("recentRows").innerHTML=sorted().slice(0,6).map(t=>'<tr><td>'+esc(t.tender_date)+'</td><td>'+esc(t.lot_number)+'</td><td>'+esc(t.platform)+'</td><td>'+money(t.lot_amount)+'</td><td class="profit">'+money(profitOf(t))+'</td><td><span class="status '+esc(t.payment_status)+'">'+statusText(t.payment_status)+'</span></td></tr>').join("")||'<tr><td colspan="6" class="muted">Пока нет записей</td></tr>';
    fillYears();renderProfitChart();
  }
  function renderProfitChart(){
    const year=Number($("chartYear").value||new Date().getFullYear()),list=yearList(year);
    const data=Array(12).fill(0);list.forEach(t=>data[new Date(t.tender_date+"T00:00:00").getMonth()]+=profitOf(t));
    if(profitChart)profitChart.destroy();
    profitChart=new Chart($("profitChart"),{type:"line",data:{labels:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],datasets:[{label:"Прибыль",data,tension:.35,fill:true,borderColor:"#42d69b",backgroundColor:"rgba(66,214,155,.12)",pointBackgroundColor:"#42d69b"}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{color:"rgba(130,150,180,.08)"},ticks:{color:"#91a0b5"}},y:{grid:{color:"rgba(130,150,180,.12)"},ticks:{color:"#91a0b5",callback:v=>new Intl.NumberFormat("ru-RU",{notation:"compact"}).format(v)}}}}});
  }
  function renderTenders(){
    const q=$("searchInput").value.trim().toLowerCase(),p=$("platformFilter").value,s=$("paymentFilter").value,from=$("fromDate").value,to=$("toDate").value;
    const list=sorted().filter(t=>(!q||(t.lot_number+" "+t.platform+" "+(t.notes||"")).toLowerCase().includes(q))&&(!p||t.platform===p)&&(!s||t.payment_status===s)&&(!from||t.tender_date>=from)&&(!to||t.tender_date<=to));
    $("tenderRows").innerHTML=list.map(t=>'<tr><td>'+esc(t.tender_date)+'</td><td>'+esc(t.lot_number)+'</td><td>'+esc(t.platform)+'</td><td>'+money(t.lot_amount)+'</td><td>'+money(t.tax)+'</td><td>'+money(t.cost_price)+'</td><td>'+money(t.extra_expenses)+'</td><td class="'+(profitOf(t)<0?"negative":"profit")+'">'+money(profitOf(t))+'</td><td><span class="status '+esc(t.payment_status)+'">'+statusText(t.payment_status)+'</span></td><td><div class="row-actions"><button data-edit="'+t.id+'">Изм.</button><button class="delete" data-delete="'+t.id+'">Удал.</button></div></td></tr>').join("");
    $("emptyState").classList.toggle("hidden",list.length!==0);$("resultCount").textContent=list.length+" записей";
    const platforms=[...new Set(tenders.map(t=>t.platform))].sort(),sel=$("platformFilter").value;
    $("platformFilter").innerHTML='<option value="">Все платформы</option>'+platforms.map(x=>'<option>'+esc(x)+'</option>').join("");$("platformFilter").value=sel;
  }
  function renderAnalytics(){
    fillYears();const year=Number($("analyticsYear").value||new Date().getFullYear()),list=yearList(year),t=totals(list);
    $("yearProfit").textContent=money(t.profit);$("yearAmount").textContent=money(t.amount);$("yearCount").textContent=list.length;$("yearMargin").textContent=(t.amount?t.profit/t.amount*100:0).toFixed(1)+"%";
    const months=Array(12).fill(0),amounts=Array(12).fill(0);list.forEach(x=>{let m=new Date(x.tender_date+"T00:00:00").getMonth();months[m]+=profitOf(x);amounts[m]+=Number(x.lot_amount);});
    if(annualChart)annualChart.destroy();
    annualChart=new Chart($("annualChart"),{type:"bar",data:{labels:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],datasets:[{label:"Оборот",data:amounts,backgroundColor:"rgba(92,145,255,.65)",borderRadius:5},{label:"Прибыль",data:months,backgroundColor:"rgba(53,201,139,.8)",borderRadius:5}]},options:{responsive:true,plugins:{legend:{labels:{color:"#aab8ca"}}},scales:{x:{ticks:{color:"#91a0b5"},grid:{display:false}},y:{ticks:{color:"#91a0b5",callback:v=>new Intl.NumberFormat("ru-RU",{notation:"compact"}).format(v)},grid:{color:"rgba(130,150,180,.12)"}}}}});
    const years=[...new Set(tenders.map(x=>new Date(x.tender_date+"T00:00:00").getFullYear()))].sort((a,b)=>b-a);
    $("yearRows").innerHTML=years.map(y=>{const a=yearList(y),v=totals(a),cost=v.tax+v.cost+v.extra;return '<tr><td>'+y+'</td><td>'+a.length+'</td><td>'+money(v.amount)+'</td><td>'+money(cost)+'</td><td class="profit">'+money(v.profit)+'</td><td>'+(v.amount?v.profit/v.amount*100:0).toFixed(1)+'%</td></tr>';}).join("")||'<tr><td colspan="6" class="muted">Нет данных</td></tr>';
  }
  async function loadTenders(){
    setSync(false,"Синхронизация…");
    const {data,error}=await client.from("tenders").select("*").order("tender_date",{ascending:false});
    if(error){setSync(false,"Ошибка синхронизации");toast("Не удалось загрузить записи: "+error.message);return;}
    tenders=data||[];setSync(true,"Облако синхронизировано");renderDashboard();renderTenders();if(activeView==="analytics")renderAnalytics();
  }
  function openDialog(t){
    $("tenderForm").reset();$("recordId").value=t?.id||"";$("dialogTitle").textContent=t?"Редактировать тендер":"Новый тендер";
    $("tenderDate").value=t?.tender_date||dateNow();$("lotNumber").value=t?.lot_number||"";$("platform").value=t?.platform||"Xarid.uzex";
    $("lotAmount").value=t?.lot_amount??"";$("tax").value=t?.tax??0;$("costPrice").value=t?.cost_price??0;$("extraExpenses").value=t?.extra_expenses??0;$("paymentStatus").value=t?.payment_status||"pending";$("notes").value=t?.notes||"";
    $("formMessage").textContent="";updatePreview();$("tenderDialog").showModal();
  }
  function updatePreview(){const p=num("lotAmount")-num("tax")-num("costPrice")-num("extraExpenses");$("profitPreview").textContent=money(p);$("profitPreview").style.color=p<0?"#ff8585":"#35c98b";}
  async function saveTender(e){
    e.preventDefault();const id=$("recordId").value;
    const row={tender_date:$("tenderDate").value,lot_number:$("lotNumber").value.trim(),platform:$("platform").value,lot_amount:num("lotAmount"),tax:num("tax"),cost_price:num("costPrice"),extra_expenses:num("extraExpenses"),payment_status:$("paymentStatus").value,notes:$("notes").value.trim()};
    if(!row.lot_number){$("formMessage").textContent="Укажите номер лота";return;}
    $("formMessage").textContent="Сохранение…";
    const result=id?await client.from("tenders").update(row).eq("id",id).select().single():await client.from("tenders").insert(row).select().single();
    if(result.error){$("formMessage").textContent="Ошибка: "+result.error.message;return;}
    $("tenderDialog").close();toast(id?"Запись обновлена":"Тендер добавлен");await loadTenders();
  }
  async function deleteTender(id){
    const t=tenders.find(x=>x.id===id);if(!t||!confirm('Удалить лот '+t.lot_number+'? Это действие нельзя отменить.'))return;
    const {error}=await client.from("tenders").delete().eq("id",id);
    if(error){toast("Ошибка удаления: "+error.message);return;}toast("Запись удалена");await loadTenders();
  }
  function exportCSV(){
    const cols=["tender_date","lot_number","platform","lot_amount","tax","cost_price","extra_expenses","profit","payment_status","notes"];
    const rows=[cols.join(";"),...sorted().map(t=>cols.map(k=>'"'+String(k==="profit"?profitOf(t):t[k]??"").replace(/"/g,'""')+'"').join(";"))];
    const blob=new Blob(["\ufeff"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="tender-profit-backup-"+dateNow()+".csv";a.click();URL.revokeObjectURL(url);
  }
  async function init(){
    $("todayLabel").textContent=new Intl.DateTimeFormat("ru-RU",{dateStyle:"long"}).format(new Date());
    if(!configured){$("authMessage").textContent="Сначала заполните SUPABASE_URL и SUPABASE_ANON_KEY в js/config.js, затем обновите страницу.";return;}
    if(!window.supabase){$("authMessage").textContent="Не удалось загрузить Supabase SDK. Проверьте подключение к интернету.";return;}
    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
    $("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authMessage").textContent="Входим…";const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});$("authMessage").textContent=error?error.message:"";});
    client.auth.onAuthStateChange(async(_event,session)=>{if(session){$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");await loadTenders();}else{$("app").classList.add("hidden");$("authScreen").classList.remove("hidden");}});
    const {data:{session}}=await client.auth.getSession();if(session){$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");await loadTenders();}
    $("logoutBtn").addEventListener("click",()=>client.auth.signOut());
    $("addTenderBtn").addEventListener("click",()=>openDialog());$("closeDialog").addEventListener("click",()=>$("tenderDialog").close());$("cancelDialog").addEventListener("click",()=>$("tenderDialog").close());
    $("tenderForm").addEventListener("submit",saveTender);["lotAmount","tax","costPrice","extraExpenses"].forEach(id=>$(id).addEventListener("input",updatePreview));
    ["searchInput","platformFilter","paymentFilter","fromDate","toDate"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderTenders));
    $("clearFilters").addEventListener("click",()=>{["searchInput","platformFilter","paymentFilter","fromDate","toDate"].forEach(id=>$(id).value="");renderTenders();});
    $("exportBtn").addEventListener("click",exportCSV);$("chartYear").addEventListener("change",renderProfitChart);$("analyticsYear").addEventListener("change",renderAnalytics);
    document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
    document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.goto)));
    $("tenderRows").addEventListener("click",e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit)openDialog(tenders.find(t=>t.id===edit.dataset.edit));if(del)deleteTender(del.dataset.delete);});
  }
  document.addEventListener("DOMContentLoaded",init);
})();