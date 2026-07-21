const s={questions:[],current:null,category:null,seen:new Set()};
const v={loading:document.querySelector('#loading'),error:document.querySelector('#error'),home:document.querySelector('#home'),question:document.querySelector('#question'),answer:document.querySelector('#answer')};
const show=n=>{Object.values(v).forEach(x=>x.classList.add('hidden'));v[n].classList.remove('hidden');scrollTo(0,0)};

const goodBtn=document.getElementById('goodBtn');
const badBtn=document.getElementById('badBtn');
const knewBtn=document.getElementById('knewBtn');
const learningBtn=document.getElementById('learningBtn');
const learningMessage=document.getElementById('learningMessage');
const feedbackMessage=document.getElementById('feedbackMessage');
const feedbackPanel=document.getElementById('feedbackPanel');
const submitFeedbackBtn=document.getElementById('submitFeedbackBtn');
const cancelFeedbackBtn=document.getElementById('cancelFeedbackBtn');
const fbQuestion=document.getElementById('fbQuestion');
const fbAnswer=document.getElementById('fbAnswer');
const fbScripture=document.getElementById('fbScripture');
const fbCategory=document.getElementById('fbCategory');
const fbDifficulty=document.getElementById('fbDifficulty');
const fbComment=document.getElementById('fbComment');

const SUPABASE_URL='https://crmywofbrznzgxibdevr.supabase.co';
const SUPABASE_KEY='sb_publishable_LV4AP960e5zTc4hTwCwTaw_Ha_e2B2J';
const QUESTIONS_URL=`${SUPABASE_URL}/rest/v1/questions`;
const FEEDBACK_URL=`${SUPABASE_URL}/functions/v1/submit-feedback`;
const LEARNING_URL=`${SUPABASE_URL}/functions/v1/submit-learning-response`;
const APP_VERSION='beta-0.5-supabase-source';

const CATEGORY_BANNERS={
  'Doctrine':'Doctrine Banner.png','Geography':'Geography Banner.png','Gospels':'Gospels Banner.png','History':'History Banner.png','People':'People Banner.png','Wisdom & Prophets':'Wisdom and Prophets Banner.png'
};
const CATEGORY_CLASSES={'Doctrine':'doctrine','Geography':'geography','Gospels':'gospels','History':'history','People':'people','Wisdom & Prophets':'wisdom'};

function getSessionId(){const key='bibleTriviaAnonymousSessionId';let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}return id}
function setBusy(buttons,busy){buttons.forEach(button=>{if(button)button.disabled=busy})}
function resetAnswerControls(){
  [fbQuestion,fbAnswer,fbScripture,fbCategory,fbDifficulty].forEach(x=>{if(x)x.checked=false});
  if(fbComment)fbComment.value='';
  feedbackPanel?.classList.add('hidden');
  learningMessage.textContent='';feedbackMessage.textContent='';
  [knewBtn,learningBtn,goodBtn,badBtn,submitFeedbackBtn,cancelFeedbackBtn].forEach(button=>{if(button){button.disabled=false;button.classList.remove('selected')}});
}
function returnHome(){resetAnswerControls();s.current=null;s.category=null;s.seen.clear();show('home')}

async function postJson(url,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  let result={};try{result=await response.json()}catch{}
  if(!response.ok||result.ok===false)throw new Error(result.error||`Request failed (${response.status})`);
  return result;
}
async function submitFeedback(q,vote,issueTags=[],comment=''){
  return postJson(FEEDBACK_URL,{question_id:q.id,vote,issue_tags:issueTags,comment,anonymous_session_id:getSessionId(),idempotency_key:crypto.randomUUID(),app_version:APP_VERSION,question_version:q.updated_at||APP_VERSION,website:''});
}
async function submitLearning(q,response){
  return postJson(LEARNING_URL,{question_id:q.id,response,anonymous_session_id:getSessionId(),idempotency_key:crypto.randomUUID(),app_version:APP_VERSION,question_version:q.updated_at||APP_VERSION,website:''});
}

async function fetchPublishedQuestions(){
  const pageSize=1000;
  const all=[];
  for(let offset=0;;offset+=pageSize){
    const params=new URLSearchParams({select:'id,category,difficulty,question,answer,reference,passage_text,updated_at',status:'eq.Published',order:'id.asc'});
    const response=await fetch(`${QUESTIONS_URL}?${params}`,{
      cache:'no-store',
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Range:`${offset}-${offset+pageSize-1}`}
    });
    if(!response.ok)throw new Error(`Question request failed (${response.status})`);
    const page=await response.json();
    if(!Array.isArray(page))throw new Error('Unexpected question response');
    all.push(...page);
    if(page.length<pageSize)break;
  }
  return all;
}

async function load(){
  try{s.questions=await fetchPublishedQuestions();if(!s.questions.length)throw Error('No published questions found');renderCategories();show('home')}
  catch(e){console.error(e);document.querySelector('#errorText').textContent='Published questions could not be loaded. Please refresh and try again.';show('error')}
}
function renderCategories(){
  const categories=[...new Set(s.questions.map(q=>(q.category||'Uncategorized').trim()))].sort();
  const box=document.querySelector('#categories');box.innerHTML='';
  categories.forEach(category=>{const button=document.createElement('button');button.className=`category category-${CATEGORY_CLASSES[category]||'default'}`;button.type='button';button.setAttribute('aria-label',category);const banner=CATEGORY_BANNERS[category];if(banner){const image=document.createElement('img');image.src=encodeURI(banner);image.alt='';image.loading='eager';image.decoding='async';button.appendChild(image)}else{button.textContent=category;button.classList.add('text-fallback')}button.onclick=()=>{s.category=category;s.seen.clear();nextQuestion()};box.appendChild(button)})
}
function nextQuestion(){
  const pool=s.questions.filter(q=>(q.category||'').trim()===s.category);let cand=pool.filter(q=>!s.seen.has(q.id));if(!cand.length){s.seen.clear();cand=pool}const q=cand[Math.floor(Math.random()*cand.length)];s.current=q;s.seen.add(q.id);qCat.textContent=q.category||'';qDiff.textContent=q.difficulty||'';qText.textContent=q.question||'';resetAnswerControls();show('question')
}
answerBtn.onclick=()=>{const q=s.current;if(!q)return;aCat.textContent=q.category||'';aDiff.textContent=q.difficulty||'';aQuestion.textContent=q.question||'';aText.textContent=q.answer||'';aRef.textContent=q.reference||'No reference provided';resetAnswerControls();show('answer')};
backBtn.onclick=returnHome;
nextBtn.onclick=returnHome;

async function handleLearning(responseValue,selectedButton){
  const q=s.current;if(!q)return;setBusy([knewBtn,learningBtn],true);learningMessage.textContent='Saving…';
  try{await submitLearning(q,responseValue);[knewBtn,learningBtn].forEach(button=>button.classList.remove('selected'));selectedButton.classList.add('selected');learningMessage.textContent=responseValue==='Knew It'?'Saved: I Knew This':'Saved: Still Learning'}
  catch(e){console.error('Learning response failed',e);learningMessage.textContent='Could not save. Please try again.';setBusy([knewBtn,learningBtn],false)}
}
knewBtn.onclick=()=>handleLearning('Knew It',knewBtn);
learningBtn.onclick=()=>handleLearning('Still Learning',learningBtn);

goodBtn.onclick=async()=>{const q=s.current;if(!q)return;setBusy([goodBtn,badBtn],true);feedbackMessage.textContent='Saving…';try{await submitFeedback(q,1);goodBtn.classList.add('selected');feedbackMessage.textContent='Thank you. Feedback saved.'}catch(e){console.error('Feedback submit failed',e);feedbackMessage.textContent='Feedback could not be saved.';setBusy([goodBtn,badBtn],false)}};
badBtn.onclick=()=>{if(!s.current)return;feedbackPanel.classList.remove('hidden');feedbackMessage.textContent=''};
cancelFeedbackBtn.onclick=()=>feedbackPanel.classList.add('hidden');
submitFeedbackBtn.onclick=async()=>{
  const q=s.current;if(!q)return;const issueTags=[];if(fbQuestion.checked)issueTags.push('Question');if(fbAnswer.checked)issueTags.push('Answer');if(fbScripture.checked)issueTags.push('Scripture');if(fbCategory.checked)issueTags.push('Category');if(fbDifficulty.checked)issueTags.push('Difficulty');if(!issueTags.length){alert('Please select at least one area that needs attention.');return}const comment=fbComment.value.trim();setBusy([submitFeedbackBtn,cancelFeedbackBtn],true);
  try{await submitFeedback(q,-1,issueTags,comment);feedbackPanel.classList.add('hidden');badBtn.classList.add('selected');setBusy([goodBtn,badBtn],true);feedbackMessage.textContent='Thank you. Feedback saved.'}
  catch(e){console.error('Feedback submit failed',e);feedbackMessage.textContent='Feedback could not be saved.';setBusy([submitFeedbackBtn,cancelFeedbackBtn],false)}
};

load();