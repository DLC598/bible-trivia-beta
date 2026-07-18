const projectUrl='https://crmywofbrznzgxibdevr.supabase.co';
const publicKey=['sb','publishable','LV4AP960e5zTc4hTwCwTaw','Ha','e2B2J'].join('_');
const db=window.supabase.createClient(projectUrl,publicKey);
const $=id=>document.getElementById(id);
const statuses=['New','Under Review','Revision Planned','Resolved','Dismissed'];
let feedback=[];

function showDashboard(active){$('loginView').classList.toggle('hidden',active);$('dashboardView').classList.toggle('hidden',!active)}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function date(v){return v?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):''}
function metrics(){
  $('totalMetric').textContent=feedback.length;
  $('positiveMetric').textContent=feedback.filter(x=>x.vote===1).length;
  $('negativeMetric').textContent=feedback.filter(x=>x.vote===-1).length;
  $('newMetric').textContent=feedback.filter(x=>x.processing_status==='New').length;
  $('commentsMetric').textContent=feedback.filter(x=>x.comment?.trim()).length;
}
function filtered(){
  const q=$('searchInput').value.trim().toLowerCase(),vote=$('voteFilter').value,status=$('statusFilter').value;
  return feedback.filter(x=>{
    const text=[x.question_id,(x.issue_tags||[]).join(' '),x.comment||''].join(' ').toLowerCase();
    return (!q||text.includes(q))&&(vote==='all'||String(x.vote)===vote)&&(status==='all'||x.processing_status===status);
  });
}
function render(){
  const rows=filtered();
  $('feedbackBody').innerHTML=rows.length?rows.map(x=>{
    const tags=(x.issue_tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="tag">None</span>';
    const options=statuses.map(s=>`<option ${s===x.processing_status?'selected':''}>${s}</option>`).join('');
    return `<tr><td>${esc(date(x.submitted_at))}</td><td><strong>${esc(x.question_id)}</strong><br><small>${esc(x.app_version||'')}</small></td><td><span class="vote ${x.vote===1?'vote-positive':'vote-negative'}">${x.vote===1?'👍 Positive':'👎 Attention'}</span></td><td><div class="tags">${tags}</div></td><td class="comment">${esc(x.comment||'')}</td><td><select class="status-select" data-id="${x.feedback_event_id}">${options}</select></td></tr>`;
  }).join(''):'<tr><td colspan="6" class="empty">No feedback matches the current filters.</td></tr>';
  document.querySelectorAll('.status-select').forEach(el=>el.onchange=()=>saveStatus(el));
}
async function saveStatus(el){
  el.disabled=true;$('dashboardMessage').textContent='Saving status…';
  const {error}=await db.from('feedback_events').update({processing_status:el.value}).eq('feedback_event_id',el.dataset.id);
  if(error){$('dashboardMessage').textContent=`Status update failed: ${error.message}`;await loadFeedback();return}
  const row=feedback.find(x=>x.feedback_event_id===el.dataset.id);if(row)row.processing_status=el.value;
  metrics();$('dashboardMessage').textContent='Status saved.';el.disabled=false;
}
async function loadFeedback(){
  $('dashboardMessage').textContent='Loading feedback…';
  const {data,error}=await db.from('feedback_events').select('feedback_event_id,question_id,vote,issue_tags,comment,app_version,question_version,processing_status,submitted_at').order('submitted_at',{ascending:false}).limit(1000);
  feedback=error?[]:(data||[]);$('dashboardMessage').textContent=error?`Unable to load feedback: ${error.message}`:`Loaded ${feedback.length} feedback event${feedback.length===1?'':'s'}.`;
  metrics();render();
}
$('loginForm').onsubmit=async e=>{e.preventDefault();const email=$('emailInput').value.trim();if(!email)return;$('loginMessage').textContent='Sending secure sign-in link…';const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('loginMessage').textContent=error?`Sign-in failed: ${error.message}`:'Check your email for the secure sign-in link.'};
$('refreshBtn').onclick=loadFeedback;$('signOutBtn').onclick=async()=>{await db.auth.signOut();showDashboard(false)};
[$('searchInput'),$('voteFilter'),$('statusFilter')].forEach(el=>el.oninput=render);
db.auth.onAuthStateChange((_event,session)=>{showDashboard(Boolean(session));if(session)loadFeedback()});
(async()=>{const {data:{session}}=await db.auth.getSession();showDashboard(Boolean(session));if(session)loadFeedback()})();