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

const FEEDBACK_URL='https://crmywofbrznzgxibdevr.supabase.co/functions/v1/submit-feedback';
const LEARNING_URL='https://crmywofbrznzgxibdevr.supabase.co/functions/v1/submit-learning-response';
const APP_VERSION='beta-0.4-learning-responses';

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
  return postJson(FEEDBACK_URL,{question_id:q.id,vote,issue_tags:issueTags,comment,anonymous_session_id:getSessionId(),idempotency_key:crypto.randomUUID(),app_version:APP_VERSION,question_version:APP_VERSION,website:''});
}
async function submitLearning(q,response){
  return postJson(LEARNING_URL,{question_id:q.id,response,anonymous_session_id:getSessionId(),idempotency_key:crypto.randomUUID(),app_version:APP_VERSION,question_version:APP_VERSION,website:''});
}

async function load(){
  try{const r=await fetch('data/questions.json',{cache:'no-store'});if(!r.ok)throw Error(r.status);const d=await r.json();s.questions=Array.isArray(d)?d:[d];if(!s.questions.length)throw Error('No published questions found');renderCategories();show('home')}
  catch(e){console.error(e);document.querySelector('#errorText').textContent='The question file could not be loaded.';show('error')}
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
nextBtn.onclick=()=>{if(!s.category)returnHome();else nextQuestion()};

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