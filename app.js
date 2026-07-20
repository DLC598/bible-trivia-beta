const s={questions:[],current:null,category:null,seen:new Set()};
const v={loading:document.querySelector('#loading'),error:document.querySelector('#error'),home:document.querySelector('#home'),question:document.querySelector('#question'),answer:document.querySelector('#answer')};
const show=n=>{Object.values(v).forEach(x=>x.classList.add('hidden'));v[n].classList.remove('hidden');scrollTo(0,0)};

const goodBtn=document.getElementById('goodBtn');
const badBtn=document.getElementById('badBtn');
const feedbackPanel=document.getElementById('feedbackPanel');
const submitFeedbackBtn=document.getElementById('submitFeedbackBtn');
const cancelFeedbackBtn=document.getElementById('cancelFeedbackBtn');
const fbQuestion=document.getElementById('fbQuestion');
const fbAnswer=document.getElementById('fbAnswer');
const fbScripture=document.getElementById('fbScripture');
const fbCategory=document.getElementById('fbCategory');
const fbDifficulty=document.getElementById('fbDifficulty');
const fbComment=document.getElementById('fbComment');

const FEEDBACK_URL='https://crmywofbrznzgxibdevr.supabase.co/functions/v1/submit-feedback';
const APP_VERSION='beta-0.3-full-question-bank';

const CATEGORY_BANNERS={
  'Doctrine':'Doctrine Banner.png',
  'Geography':'Geography Banner.png',
  'Gospels':'Gospels Banner.png',
  'History':'History Banner.png',
  'People':'People Banner.png',
  'Wisdom & Prophets':'Wisdom and Prophets Banner.png'
};

function getSessionId(){
  const key='bibleTriviaAnonymousSessionId';
  let id=localStorage.getItem(key);
  if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}
  return id;
}

function resetFeedbackPanel(){
  [fbQuestion,fbAnswer,fbScripture,fbCategory,fbDifficulty].forEach(x=>{if(x)x.checked=false});
  if(fbComment)fbComment.value='';
  if(feedbackPanel)feedbackPanel.classList.add('hidden');
  if(goodBtn)goodBtn.disabled=false;
  if(badBtn)badBtn.disabled=false;
  if(submitFeedbackBtn)submitFeedbackBtn.disabled=false;
  if(cancelFeedbackBtn)cancelFeedbackBtn.disabled=false;
}

function returnHome(){
  resetFeedbackPanel();
  s.current=null;
  s.category=null;
  s.seen.clear();
  show('home');
}

async function submitToSupabase(q,vote,issueTags=[],comment=''){
  const response=await fetch(FEEDBACK_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      question_id:q.id,
      vote,
      issue_tags:issueTags,
      comment,
      anonymous_session_id:getSessionId(),
      idempotency_key:crypto.randomUUID(),
      app_version:APP_VERSION,
      question_version:APP_VERSION,
      website:''
    })
  });
  let result={};
  try{result=await response.json()}catch{}
  if(!response.ok||result.ok===false)throw new Error(result.error||`Feedback request failed (${response.status})`);
  return result;
}

async function load(){
  try{
    const r=await fetch('data/questions.json',{cache:'no-store'});
    if(!r.ok)throw Error(r.status);
    const d=await r.json();
    s.questions=Array.isArray(d)?d:[d];
    if(!s.questions.length)throw Error('No published questions found');
    renderCategories();
    show('home');
  }catch(e){
    console.error(e);
    document.querySelector('#errorText').textContent='The question file could not be loaded.';
    show('error');
  }
}

function renderCategories(){
  const counts={};
  s.questions.forEach(q=>{
    const category=(q.category||'Uncategorized').trim();
    counts[category]=(counts[category]||0)+1;
  });

  const box=document.querySelector('#categories');
  box.innerHTML='';

  Object.entries(counts).sort().forEach(([category,count])=>{
    const button=document.createElement('button');
    button.className='category';
    button.type='button';
    button.setAttribute('aria-label',`${category}: ${count} ${count===1?'question':'questions'}`);

    const banner=CATEGORY_BANNERS[category];
    if(banner){
      button.style.backgroundImage=`url("${encodeURI(banner)}")`;
      button.classList.add('has-banner');
    }

    button.innerHTML=`<span class="category-label">${category}</span><span class="count">${count} ${count===1?'question':'questions'}</span>`;
    button.onclick=()=>{s.category=category;s.seen.clear();nextQuestion()};
    box.appendChild(button);
  });
}

function nextQuestion(){const pool=s.questions.filter(q=>(q.category||'').trim()===s.category);let cand=pool.filter(q=>!s.seen.has(q.id));if(!cand.length){s.seen.clear();cand=pool}const q=cand[Math.floor(Math.random()*cand.length)];s.current=q;s.seen.add(q.id);qCat.textContent=q.category||'';qDiff.textContent=q.difficulty||'';qId.textContent=q.id?`Question ID: ${q.id}`:'';qText.textContent=q.question||'';show('question')}
answerBtn.onclick=()=>{const q=s.current;if(!q)return;aCat.textContent=q.category||'';aDiff.textContent=q.difficulty||'';aId.textContent=q.id?`Question ID: ${q.id}`:'';aQuestion.textContent=q.question||'';aText.textContent=q.answer||'';aRef.textContent=q.reference||'No reference provided';resetFeedbackPanel();show('answer')};
backBtn.onclick=()=>{s.current=null;s.category=null;s.seen.clear();show('home')};
nextBtn.onclick=returnHome;

goodBtn.onclick=async()=>{
  const q=s.current;if(!q)return;
  goodBtn.disabled=true;badBtn.disabled=true;
  try{await submitToSupabase(q,1);returnHome()}
  catch(e){console.error('Feedback submit failed',e);alert('Feedback could not be saved. Please try again.');goodBtn.disabled=false;badBtn.disabled=false}
};

badBtn.onclick=()=>{if(!s.current)return;resetFeedbackPanel();feedbackPanel.classList.remove('hidden')};
cancelFeedbackBtn.onclick=()=>resetFeedbackPanel();

submitFeedbackBtn.onclick=async()=>{
  const q=s.current;if(!q)return;
  const issueTags=[];
  if(fbQuestion.checked)issueTags.push('Question');
  if(fbAnswer.checked)issueTags.push('Answer');
  if(fbScripture.checked)issueTags.push('Scripture');
  if(fbCategory.checked)issueTags.push('Category');
  if(fbDifficulty.checked)issueTags.push('Difficulty');
  if(!issueTags.length){alert('Please select at least one area that needs attention.');return}
  const comment=fbComment.value.trim();
  submitFeedbackBtn.disabled=true;cancelFeedbackBtn.disabled=true;
  try{await submitToSupabase(q,-1,issueTags,comment);returnHome()}
  catch(e){console.error('Feedback submit failed',e);alert('Feedback could not be saved. Please try again.');submitFeedbackBtn.disabled=false;cancelFeedbackBtn.disabled=false}
};

load();