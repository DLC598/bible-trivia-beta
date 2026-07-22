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
  const reviewed=questions.filter(q=>q.reviewed).length;
  const remaining=questions.length-reviewed;
  const moreWork=questions.filter(q=>q.needs_more_work).length;
  const percent=questions.length?Math.round(reviewed/questions.length*100):0;
  $('totalQuestionsMetric').textContent=questions.length;
  $('reviewedMetric').textContent=reviewed;
  $('remainingMetric').textContent=remaining;
  $('moreWorkMetric').textContent=moreWork;
  $('reviewedPercentText').textContent=`${percent}% complete`;
  $('reviewProgressText').textContent=`${reviewed} of ${questions.length} reviewed`;
  $('reviewProgressBar').style.width=`${percent}%`;
  $('reviewBadge').textContent=reviewQueue().length;
  const newCount=feedback.filter(f=>f.processing_status==='New').length;
  $('feedbackBadge').textContent=newCount;
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
  $('recentQuestions').innerHTML=recent.length?recent.map(q=>`<div class="question-row"><div><strong>${esc(q.question)}</strong><small>${esc(q.id)} · ${esc(q.category)} · ${esc(q.difficulty)}</small></div>${reviewLabel(q)}</div>`).join(''):'<div class="empty">No questions have been imported yet.</div>';
  $('recentFeedback').innerHTML=feedback.slice(0,5).map(f=>`<div class="feedback-row"><div><strong>${esc(f.comment||((f.vote===1)?'Good question':'Needs attention'))}</strong><small>${esc(f.question_id)} · ${esc((f.issue_tags||[]).join(', ')||'No issue tag')}</small></div><span class="vote ${f.vote===1?'vote-positive':'vote-negative'}">${f.vote===1?'Positive':'Attention'}</span></div>`).join('')||'<div class="empty">No feedback yet.</div>';
  const counts=categoryCounts();
  $('categoryPreview').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="category-pill"><strong>${esc(c)}</strong><span>${n} question${n===1?'':'s'}</span></div>`).join('')||'<div class="empty">Import the current bank to see categories.</div>';
}
function renderCategories(){const counts=categoryCounts();const categories=[...new Set([...Object.keys(categoryBanners),...Object.keys(counts)])].sort();$('categoriesGrid').innerHTML=categories.map(c=>`<article class="category-card"><h3>${esc(c)}</h3><p>${counts[c]||0} question${counts[c]===1?'':'s'}</p><small>${categoryBanners[c]?'Banner connected':'No banner assigned'}</small></article>`).join('')}
function renderAll(){populateCategoryControls();renderOverview();renderQuestions();renderFeedback();renderCategories()}

async function loadData(){
  setMessage('Loading dashboard…');
  const [qRes,fRes]=await Promise.all([db.from('questions').select('*').order('updated_at',{ascending:false}).limit(5000),db.from('feedback_events').select('feedback_event_id,question_id,vote,issue_tags,comment,app_version,question_version,processing_status,submitted_at').order('submitted_at',{ascending:false}).limit(1000)]);
  questions=qRes.error?[]:(qRes.data||[]);feedback=fRes.error?[]:(fRes.data||[]);
  const errors=[qRes.error?.message,fRes.error?.message].filter(Boolean);
  setMessage(errors.length?`Some data could not be loaded: ${errors.join(' | ')}`:`Loaded ${questions.length} questions and ${feedback.length} feedback items.`);
  renderAll();
  await loadQuestionSubmissions();
}

$('loginForm').onsubmit=async e=>{e.preventDefault();const email=$('emailInput').value.trim();if(!email)return;$('loginMessage').textContent='Sending secure sign-in link…';const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});$('loginMessage').textContent=error?`Sign-in failed: ${error.message}`:'Check your email for the secure sign-in link.'};
$('signOutBtn').onclick=async()=>{await db.auth.signOut();showDashboard(false)};
$('refreshBtn').onclick=loadData;
$('menuBtn').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
db.auth.onAuthStateChange((_event,session)=>{showDashboard(Boolean(session));if(session)loadData()});
(async()=>{const {data:{session}}=await db.auth.getSession();showDashboard(Boolean(session));if(session)loadData()})();
