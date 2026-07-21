const projectUrl='https://crmywofbrznzgxibdevr.supabase.co';
const publicKey=['sb','publishable','LV4AP960e5zTc4hTwCwTaw','Ha','e2B2J'].join('_');
const db=window.supabase.createClient(projectUrl,publicKey);
const $=id=>document.getElementById(id);
const statuses=['New','Under Review','Revision Planned','Resolved','Dismissed'];
const categoryBanners={Doctrine:'Doctrine Banner.png',Geography:'Geography Banner.png',Gospels:'Gospels Banner.png',History:'History Banner.png',People:'People Banner.png','Wisdom & Prophets':'Wisdom and Prophets Banner.png'};
const allowedDifficulties=['Easy','Medium','Hard'];
let feedback=[];
let questions=[];
let importRows=[];
let workbook=null;

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtDate(v){return v?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(v)):''}
function showDashboard(active){$('loginView').classList.toggle('hidden',active);$('dashboardView').classList.toggle('hidden',!active)}
function setMessage(text=''){$('dashboardMessage').textContent=text}
function normalizeHeader(v=''){return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g,'')}
function firstValue(row,names){const keys=Object.keys(row);for(const name of names){const key=keys.find(k=>normalizeHeader(k)===name);if(key&&row[key]!==undefined&&row[key]!==null)return String(row[key]).trim()}return''}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $(`${name}View`).classList.remove('hidden');
  document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={overview:['Welcome back, Daniel','Here is what is happening with your Bible Trivia app.'],questions:['Question Bank','Add, edit, publish, retire, or import questions.'],feedback:['Feedback Review','Review reports and track each item to resolution.'],categories:['Categories','See question distribution across the app.']};
  $('pageTitle').textContent=titles[name][0];$('pageSubtitle').textContent=titles[name][1];
  document.querySelector('.sidebar').classList.remove('open');
}

function questionMetrics(){
  $('totalQuestionsMetric').textContent=questions.length;
  $('publishedMetric').textContent=questions.filter(q=>q.status==='Published').length;
  $('feedbackMetric').textContent=feedback.length;
  const newCount=feedback.filter(f=>f.processing_status==='New').length;
  $('newFeedbackText').textContent=`${newCount} new`;$('feedbackBadge').textContent=newCount;
  $('attentionMetric').textContent=feedback.filter(f=>f.vote===-1&&!['Resolved','Dismissed'].includes(f.processing_status)).length;
}
function categoryCounts(){const map={};questions.forEach(q=>{map[q.category]=(map[q.category]||0)+1});return map}
function populateCategoryControls(){
  const categories=[...new Set([...Object.keys(categoryBanners),...questions.map(q=>q.category).filter(Boolean)])].sort();
  $('questionCategoryFilter').innerHTML='<option value="all">All categories</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');
  $('questionCategory').innerHTML=categories.map(c=>`<option>${esc(c)}</option>`).join('');
}
function renderOverview(){
  questionMetrics();
  const recent=[...questions].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)).slice(0,5);
  $('recentQuestions').innerHTML=recent.length?recent.map(q=>`<div class="question-row"><div><strong>${esc(q.question)}</strong><small>${esc(q.id)} · ${esc(q.category)} · ${esc(q.difficulty)}</small></div><span class="status status-${esc(q.status)}">${esc(q.status)}</span></div>`).join(''):'<div class="empty">No questions have been imported yet.</div>';
  $('recentFeedback').innerHTML=feedback.slice(0,5).map(f=>`<div class="feedback-row"><div><strong>${esc(f.comment||((f.vote===1)?'Good question':'Needs attention'))}</strong><small>${esc(f.question_id)} · ${esc((f.issue_tags||[]).join(', ')||'No issue tag')}</small></div><span class="vote ${f.vote===1?'vote-positive':'vote-negative'}">${f.vote===1?'Positive':'Attention'}</span></div>`).join('')||'<div class="empty">No feedback yet.</div>';
  const counts=categoryCounts();
  $('categoryPreview').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="category-pill"><strong>${esc(c)}</strong><span>${n} question${n===1?'':'s'}</span></div>`).join('')||'<div class="empty">Import the current bank to see categories.</div>';
}
function filteredQuestions(){const text=$('questionSearch').value.trim().toLowerCase(),cat=$('questionCategoryFilter').value,status=$('questionStatusFilter').value;return questions.filter(q=>{const hay=[q.id,q.question,q.answer,q.reference,q.category,q.difficulty].join(' ').toLowerCase();return(!text||hay.includes(text))&&(cat==='all'||q.category===cat)&&(status==='all'||q.status===status)})}
function renderQuestions(){
  const rows=filteredQuestions();
  $('questionsBody').innerHTML=rows.length?rows.map(q=>`<tr><td><strong>${esc(q.id)}</strong></td><td class="question-cell"><strong>${esc(q.question)}</strong><br><small>${esc(q.answer)}</small></td><td>${esc(q.category)}</td><td>${esc(q.difficulty)}</td><td><span class="status status-${esc(q.status)}">${esc(q.status)}</span></td><td>${esc(fmtDate(q.updated_at))}</td><td><div class="row-actions"><button class="secondary edit-question" data-id="${esc(q.id)}">Edit</button></div></td></tr>`).join(''):'<tr><td colspan="7" class="empty">No questions match these filters.</td></tr>';
  document.querySelectorAll('.edit-question').forEach(b=>b.onclick=()=>openQuestionDialog(questions.find(q=>q.id===b.dataset.id)));
}
function filteredFeedback(){const q=$('feedbackSearch').value.trim().toLowerCase(),vote=$('voteFilter').value,status=$('statusFilter').value;return feedback.filter(x=>{const text=[x.question_id,(x.issue_tags||[]).join(' '),x.comment||''].join(' ').toLowerCase();return(!q||text.includes(q))&&(vote==='all'||String(x.vote)===vote)&&(status==='all'||x.processing_status===status)})}
function renderFeedback(){
  const rows=filteredFeedback();
  $('feedbackBody').innerHTML=rows.length?rows.map(x=>{const tags=(x.issue_tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="tag">None</span>';const options=statuses.map(s=>`<option ${s===x.processing_status?'selected':''}>${s}</option>`).join('');return `<tr><td>${esc(fmtDate(x.submitted_at))}</td><td><strong>${esc(x.question_id)}</strong></td><td><span class="vote ${x.vote===1?'vote-positive':'vote-negative'}">${x.vote===1?'Positive':'Attention'}</span></td><td><div class="tags">${tags}</div></td><td>${esc(x.comment||'')}</td><td><select class="status-select" data-id="${x.feedback_event_id}">${options}</select></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">No feedback matches these filters.</td></tr>';
  document.querySelectorAll('.status-select').forEach(el=>el.onchange=()=>saveFeedbackStatus(el));
}
function renderCategories(){const counts=categoryCounts();const categories=[...new Set([...Object.keys(categoryBanners),...Object.keys(counts)])].sort();$('categoriesGrid').innerHTML=categories.map(c=>`<article class="category-card"><h3>${esc(c)}</h3><p>${counts[c]||0} question${counts[c]===1?'':'s'}</p><small>${categoryBanners[c]?'Banner connected':'No banner assigned'}</small></article>`).join('')}
function renderAll(){populateCategoryControls();renderOverview();renderQuestions();renderFeedback();renderCategories()}

async function loadData(){
  setMessage('Loading dashboard…');
  const [qRes,fRes]=await Promise.all([db.from('questions').select('*').order('updated_at',{ascending:false}).limit(5000),db.from('feedback_events').select('feedback_event_id,question_id,vote,issue_tags,comment,app_version,question_version,processing_status,submitted_at').order('submitted_at',{ascending:false}).limit(1000)]);
  questions=qRes.error?[]:(qRes.data||[]);feedback=fRes.error?[]:(fRes.data||[]);
  const errors=[qRes.error?.message,fRes.error?.message].filter(Boolean);
  setMessage(errors.length?`Some data could not be loaded: ${errors.join(' | ')}`:`Loaded ${questions.length} questions and ${feedback.length} feedback items.`);renderAll();
}
async function saveFeedbackStatus(el){el.disabled=true;setMessage('Saving feedback status…');const {error}=await db.from('feedback_events').update({processing_status:el.value}).eq('feedback_event_id',el.dataset.id);if(error){setMessage(`Status update failed: ${error.message}`);el.disabled=false;return}const row=feedback.find(x=>x.feedback_event_id===el.dataset.id);if(row)row.processing_status=el.value;setMessage('Feedback status saved.');el.disabled=false;renderOverview()}

function openQuestionDialog(q=null){$('questionForm').reset();$('originalQuestionId').value=q?.id||'';$('dialogTitle').textContent=q?'Edit Question':'Add Question';$('questionId').value=q?.id||'';$('questionCategory').value=q?.category||Object.keys(categoryBanners)[0];$('questionDifficulty').value=q?.difficulty||'Medium';$('questionStatus').value=q?.status||'Draft';$('questionText').value=q?.question||'';$('answerText').value=q?.answer||'';$('referenceText').value=q?.reference||'';$('questionDialog').showModal()}
async function saveQuestion(e){
  e.preventDefault();const original=$('originalQuestionId').value.trim(),id=$('questionId').value.trim();
  const payload={id,category:$('questionCategory').value,difficulty:$('questionDifficulty').value,status:$('questionStatus').value,question:$('questionText').value.trim(),answer:$('answerText').value.trim(),reference:$('referenceText').value.trim()||null};if(!id||!payload.question||!payload.answer)return;
  setMessage('Saving question…');let error;
  if(original&&original!==id){const del=await db.from('questions').delete().eq('id',original);if(del.error){error=del.error}else{({error}=await db.from('questions').insert(payload))}}else if(original){({error}=await db.from('questions').update(payload).eq('id',original))}else{({error}=await db.from('questions').insert(payload))}
  if(error){setMessage(`Question could not be saved: ${error.message}`);return}$('questionDialog').close();setMessage('Question saved.');await loadData();showView('questions');
}

function openImportDialog(){
  importRows=[];workbook=null;$('importFile').value='';$('importSheet').innerHTML='<option>First available sheet</option>';$('importSheet').disabled=true;$('analyzeImportBtn').disabled=true;$('importResults').classList.add('hidden');$('importMessage').textContent='';$('importDialog').showModal();
}
function closeImportDialog(){$('importDialog').close()}
function mapRow(row,index,defaultStatus){
  const id=firstValue(row,['id','questionid','questionnumber','qid']);
  const question=firstValue(row,['question','questiontext','prompt']);
  const answer=firstValue(row,['answer','answertext','correctanswer']);
  const category=firstValue(row,['category','topic'])||'Uncategorized';
  const rawDifficulty=firstValue(row,['difficulty','level'])||'Medium';
  const difficulty=allowedDifficulties.find(d=>d.toLowerCase()===rawDifficulty.toLowerCase())||rawDifficulty;
  const reference=firstValue(row,['reference','scripturereference','scripture','biblereference','verse']);
  const rawStatus=firstValue(row,['status','publicationstatus']);
  const status=['Draft','Published','Retired'].find(s=>s.toLowerCase()===rawStatus.toLowerCase())||defaultStatus;
  const errors=[];const warnings=[];
  if(!id)errors.push('Missing ID');if(!question)errors.push('Missing question');if(!answer)errors.push('Missing answer');if(!allowedDifficulties.includes(difficulty))errors.push(`Invalid difficulty: ${rawDifficulty}`);if(!reference)warnings.push('Missing Scripture reference');
  return{row:index+2,id,question,answer,category,difficulty,reference:reference||null,status,errors,warnings};
}
function validateImport(rawRows){
  const mapped=rawRows.map((r,i)=>mapRow(r,i,$('importStatus').value));
  const ids=new Map(),qa=new Map();
  mapped.forEach(r=>{if(r.id){ids.set(r.id,(ids.get(r.id)||0)+1)}const key=`${r.question}`.trim().toLowerCase()+'|'+`${r.answer}`.trim().toLowerCase();if(r.question&&r.answer)qa.set(key,(qa.get(key)||0)+1)});
  mapped.forEach(r=>{if(r.id&&ids.get(r.id)>1)r.errors.push('Duplicate ID in file');const key=`${r.question}`.trim().toLowerCase()+'|'+`${r.answer}`.trim().toLowerCase();if(r.question&&r.answer&&qa.get(key)>1)r.warnings.push('Possible duplicate question and answer');if(r.id&&questions.some(q=>q.id===r.id))r.warnings.push('Existing ID will be updated')});
  return mapped;
}
function displayImportResults(rows){
  importRows=rows;const valid=rows.filter(r=>!r.errors.length),warnings=rows.filter(r=>r.warnings.length),blocked=rows.filter(r=>r.errors.length);
  $('importRows').textContent=rows.length;$('importValid').textContent=valid.length;$('importWarnings').textContent=warnings.length;$('importBlocked').textContent=blocked.length;
  const issueCounts={};rows.flatMap(r=>[...r.errors,...r.warnings]).forEach(x=>issueCounts[x]=(issueCounts[x]||0)+1);
  $('importSummary').innerHTML=Object.keys(issueCounts).length?Object.entries(issueCounts).map(([k,n])=>`<span>${esc(k)}: <strong>${n}</strong></span>`).join(''):'<span class="validation-ok">All rows passed validation.</span>';
  $('importPreviewBody').innerHTML=rows.slice(0,100).map(r=>`<tr><td>${r.row}</td><td><strong>${esc(r.id||'—')}</strong></td><td>${esc(r.question||'—')}</td><td>${esc(r.category)}</td><td>${esc(r.difficulty)}</td><td><span class="import-result ${r.errors.length?'blocked':r.warnings.length?'warning':'valid'}">${r.errors.length?esc(r.errors.join('; ')):r.warnings.length?esc(r.warnings.join('; ')):'Valid'}</span></td></tr>`).join('');
  $('commitImportBtn').disabled=!valid.length;$('commitImportBtn').textContent=`Import ${valid.length} Valid Question${valid.length===1?'':'s'}`;$('importResults').classList.remove('hidden');$('importMessage').textContent=rows.length>100?'Preview shows the first 100 rows. All valid rows will be imported.':'';
}
async function readSelectedFile(){
  const file=$('importFile').files[0];if(!file)return;
  $('importMessage').textContent='Reading file…';
  try{
    const ext=file.name.split('.').pop().toLowerCase();
    if(ext==='json'){const raw=JSON.parse(await file.text());displayImportResults(validateImport(Array.isArray(raw)?raw:[raw]));return}
    if(!window.XLSX)throw new Error('The Excel reader did not load. Refresh and try again.');
    const data=await file.arrayBuffer();workbook=XLSX.read(data,{type:'array'});
    $('importSheet').innerHTML=workbook.SheetNames.map(n=>`<option>${esc(n)}</option>`).join('');$('importSheet').disabled=false;
    analyzeWorkbookSheet();
  }catch(err){$('importMessage').textContent=`Could not read file: ${err.message}`}
}
function analyzeWorkbookSheet(){if(!workbook)return;const sheet=workbook.Sheets[$('importSheet').value||workbook.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(sheet,{defval:''});displayImportResults(validateImport(raw))}
async function analyzeCurrentLiveBank(){
  $('importMessage').textContent='Loading current live question bank…';
  try{const r=await fetch('data/questions.json',{cache:'no-store'});if(!r.ok)throw new Error(`Request failed (${r.status})`);const raw=await r.json();displayImportResults(validateImport(Array.isArray(raw)?raw:[raw]))}catch(err){$('importMessage').textContent=`Could not load live bank: ${err.message}`}
}
async function commitImport(){
  const list=importRows.filter(r=>!r.errors.length).map(({id,category,difficulty,question,answer,reference,status})=>({id,category,difficulty,question,answer,reference,status}));if(!list.length)return;
  $('commitImportBtn').disabled=true;
  try{const chunkSize=200;for(let i=0;i<list.length;i+=chunkSize){$('importMessage').textContent=`Importing ${Math.min(i+chunkSize,list.length)} of ${list.length}…`;const {error}=await db.from('questions').upsert(list.slice(i,i+chunkSize),{onConflict:'id'});if(error)throw error}$('importMessage').textContent=`Imported ${list.length} questions successfully.`;await loadData();setTimeout(()=>{closeImportDialog();showView('questions')},700)}catch(err){$('importMessage').textContent=`Import failed: ${err.message}`;$('commitImportBtn').disabled=false}
}
function exportPublished(){const data=questions.filter(q=>q.status==='Published').map(({id,category,difficulty,question,answer,reference})=>({id,category,difficulty,question,answer,reference}));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='questions.json';a.click();URL.revokeObjectURL(url);setMessage(`Exported ${data.length} published questions.`)}

$('loginForm').onsubmit=async e=>{e.preventDefault();const email=$('emailInput').value.trim();if(!email)return;$('loginMessage').textContent='Sending secure sign-in link…';const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});$('loginMessage').textContent=error?`Sign-in failed: ${error.message}`:'Check your email for the secure sign-in link.'};
$('signOutBtn').onclick=async()=>{await db.auth.signOut();showDashboard(false)};$('refreshBtn').onclick=loadData;$('menuBtn').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
[$('navAddQuestion'),$('overviewAddBtn'),$('quickAdd'),$('addQuestionBtn')].forEach(b=>b.onclick=()=>openQuestionDialog());
[$('navImport'),$('importBtn'),$('questionsImportBtn')].forEach(b=>b.onclick=openImportDialog);
$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('questionDialog').close();$('questionForm').onsubmit=saveQuestion;
$('closeImportDialog').onclick=$('cancelImportBtn').onclick=closeImportDialog;$('importFile').onchange=()=>{$('analyzeImportBtn').disabled=!$('importFile').files.length;if($('importFile').files.length)readSelectedFile()};$('analyzeImportBtn').onclick=readSelectedFile;$('importSheet').onchange=analyzeWorkbookSheet;$('importLiveBankBtn').onclick=analyzeCurrentLiveBank;$('commitImportBtn').onclick=commitImport;$('exportBtn').onclick=exportPublished;
[$('questionSearch'),$('questionCategoryFilter'),$('questionStatusFilter')].forEach(el=>el.oninput=renderQuestions);[$('feedbackSearch'),$('voteFilter'),$('statusFilter')].forEach(el=>el.oninput=renderFeedback);
db.auth.onAuthStateChange((_event,session)=>{showDashboard(Boolean(session));if(session)loadData()});
(async()=>{const {data:{session}}=await db.auth.getSession();showDashboard(Boolean(session));if(session)loadData()})();