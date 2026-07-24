const s={questions:[],current:null,category:null,categories:[],seen:new Set()};
const v={loading:document.querySelector('#loading'),error:document.querySelector('#error'),home:document.querySelector('#home'),information:document.querySelector('#information'),question:document.querySelector('#question'),answer:document.querySelector('#answer'),submitQuestion:document.querySelector('#submitQuestion')};
const show=n=>{Object.values(v).forEach(x=>x.classList.add('hidden'));v[n].classList.remove('hidden');document.body.classList.toggle('inner-screen',n==='question'||n==='answer'||n==='submitQuestion'||n==='information');scrollTo(0,0)};

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
const openSubmitQuestionBtn=document.getElementById('openSubmitQuestionBtn');
const openInformationBtn=document.getElementById('openInformationBtn');
const infoBackBtn=document.getElementById('infoBackBtn');
const submitQuestionForm=document.getElementById('submitQuestionForm');
const submitQuestionBtn=document.getElementById('submitQuestionBtn');
const cancelQuestionBtn=document.getElementById('cancelQuestionBtn');
const submissionMessage=document.getElementById('submissionMessage');
const sqQuestion=document.getElementById('sqQuestion');
const sqCategory=document.getElementById('sqCategory');
const sqDifficulty=document.getElementById('sqDifficulty');
const sqAnswer=document.getElementById('sqAnswer');
const sqScripture=document.getElementById('sqScripture');

const SUPABASE_URL='https://crmywofbrznzgxibdevr.supabase.co';
const SUPABASE_KEY='sb_publishable_LV4AP960e5zTc4hTwCwTaw_Ha_e2B2J';
const QUESTIONS_URL=`${SUPABASE_URL}/rest/v1/questions`;
const FEEDBACK_URL=`${SUPABASE_URL}/functions/v1/submit-feedback`;
const LEARNING_URL=`${SUPABASE_URL}/functions/v1/submit-learning-response`;
const SUBMIT_QUESTION_URL=`${SUPABASE_URL}/functions/v1/submit-question`;
const APP_VERSION='beta-0.7-visual-redesign';

const CATEGORY_SLUGS={'Doctrine':'doctrine','Geography':'geography','Gospels':'gospels','History':'history','People':'people','Writings':'writings'};
const ASSET_EXT={shields:'png',banners:'jpg'};
function assetPath(kind,category){const slug=CATEGORY_SLUGS[category];return slug?`assets/${kind}/${slug}.${ASSET_EXT[kind]}`:''}

function getSessionId(){const key='bibleTriviaAnonymousSessionId';let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}return id}
function setBusy(buttons,busy){buttons.forEach(button=>{if(button)button.disabled=busy})}
function resetAnswerControls(){
  [fbQuestion,fbAnswer,fbScripture,fbCategory,fbDifficulty].forEach(x=>{if(x)x.checked=false});
  if(fbComment)fbComment.value='';
  feedbackPanel?.classList.add('hidden');
  learningMessage.textContent='';feedbackMessage.textContent='';
  [knewBtn,learningBtn,goodBtn,badBtn,submitFeedbackBtn,cancelFeedbackBtn].forEach(button=>{if(button){button.disabled=false;button.classList.remove('selected')}});
}
function resetSubmissionForm(){submitQuestionForm.reset();submissionMessage.textContent='';setBusy([submitQuestionBtn,cancelQuestionBtn],false)}
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
  try{
    s.questions=await fetchPublishedQuestions();
    if(!s.questions.length)throw Error('No published questions found');
    s.categories=[...new Set(s.questions.map(q=>(q.category||'Uncategorized').trim()))].sort();
    renderCategories();
    renderShieldRow();
    show('home');
  }
  catch(e){console.error(e);document.querySelector('#errorText').textContent='Published questions could not be loaded. Please refresh and try again.';show('error')}
}
function buildCategoryTile(category,{small=false}={}){
  const button=document.createElement('button');
  button.className=small?'category shield-tile':'category';
  button.type='button';
  button.setAttribute('aria-label',category);
  const slug=CATEGORY_SLUGS[category];
  if(slug){
    const image=document.createElement('img');
    image.className='category-shield';
    image.src=`assets/shields/${slug}.png`;
    image.alt='';image.loading='eager';image.decoding='async';
    button.appendChild(image);
  }else{
    button.classList.add('text-fallback');
  }
  const label=document.createElement('span');
  label.className='category-label';
  label.textContent=category;
  button.appendChild(label);
  button.onclick=()=>{s.category=category;s.seen.clear();nextQuestion()};
  return button;
}
function renderCategories(){
  const box=document.querySelector('#categories');box.innerHTML='';
  s.categories.forEach(category=>box.appendChild(buildCategoryTile(category)));
}
function renderShieldRow(){
  const box=document.querySelector('#answerShieldRow');if(!box)return;box.innerHTML='';
  s.categories.forEach(category=>box.appendChild(buildCategoryTile(category,{small:true})));
}
function renderCategoryBanner(prefix,category){
  const bannerImg=document.getElementById(`${prefix}BannerImg`);
  const shieldImg=document.getElementById(`${prefix}BannerShield`);
  const nameEl=document.getElementById(`${prefix}BannerName`);
  bannerImg.src=assetPath('banners',category);
  shieldImg.src=assetPath('shields',category);
  nameEl.textContent=category||'';
}
function nextQuestion(){
  const pool=s.questions.filter(q=>(q.category||'').trim()===s.category);let cand=pool.filter(q=>!s.seen.has(q.id));if(!cand.length){s.seen.clear();cand=pool}const q=cand[Math.floor(Math.random()*cand.length)];s.current=q;s.seen.add(q.id);renderCategoryBanner('q',q.category);qText.textContent=q.question||'';resetAnswerControls();show('question')
}
answerBtn.onclick=()=>{const q=s.current;if(!q)return;renderCategoryBanner('a',q.category);aQuestion.textContent=q.question||'';aText.textContent=q.answer||'';aRef.textContent=q.reference||'No reference provided';resetAnswerControls();show('answer')};
backBtn.onclick=returnHome;
nextBtn.onclick=returnHome;
openSubmitQuestionBtn.onclick=()=>{resetSubmissionForm();show('submitQuestion')};
cancelQuestionBtn.onclick=returnHome;
openInformationBtn.onclick=()=>show('information');
infoBackBtn.onclick=()=>show('home');
submitQuestionForm.onsubmit=async event=>{
  event.preventDefault();
  const payload={question:sqQuestion.value.trim(),category:sqCategory.value,difficulty:sqDifficulty.value,answer:sqAnswer.value.trim(),scripture:sqScripture.value.trim(),anonymous_session_id:getSessionId()};
  if(!payload.question&&!payload.answer&&!payload.scripture){submissionMessage.textContent='Please provide at least a question, answer, or Scripture passage.';return}
  setBusy([submitQuestionBtn,cancelQuestionBtn],true);submissionMessage.textContent='Submitting…';
  try{await postJson(SUBMIT_QUESTION_URL,payload);submitQuestionForm.reset();submissionMessage.textContent='Thank you. Your submission is now waiting for review.';submitQuestionBtn.disabled=true;setTimeout(returnHome,1800)}
  catch(e){console.error('Question submission failed',e);submissionMessage.textContent=e.message||'Submission could not be saved. Please try again.';setBusy([submitQuestionBtn,cancelQuestionBtn],false)}
};

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
