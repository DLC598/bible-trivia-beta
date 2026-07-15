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
const APP_VERSION='beta-0.2-reviewed-120';
const APPROVED_QUESTION_TEXTS=new Set(["What city did Paul identify as his hometown?","On what island was John when he received the revelation?","Where did Elijah confront the prophets of Baal?","What river did Israel cross to enter the Promised Land?","What port city did Jonah leave from when fleeing toward Tarshish?","Where was Paul when he saw the vision of the man from Macedonia?","Where did Israel camp immediately before crossing the Jordan?","What place did Jacob rename Bethel after his dream?","What pool in Jerusalem had five roofed colonnades?","Where was Saul headed when Jesus appeared to him?","What brook did Jesus cross before entering the garden?","In what city did Paul see an altar to an unknown god?","What place did Moses name because Israel tested the Lord?","What mountain did Noah’s ark come to rest on?","What brook did God send Elijah to during the drought?","In what valley did David face Goliath?","What river did Jacob cross before wrestling through the night?","Where was Achan stoned after his sin was exposed?","From where did Ezekiel’s life-giving river flow?","Which two mountains were named for blessing and curse before Israel entered the land?","What did Jesus turn water into at Cana?","Who baptized Jesus in the Jordan?","In the parable of the sower, what is the seed?","What animal did Jesus ride into Jerusalem?","What did the wise virgins take that the foolish did not?","In the parable of the weeds, what is the field?","What did the merchant sell to buy the pearl of great value?","What sign did Jesus say would be given to that generation?","What command did Jesus cry before Lazarus came out?","In John 15, what does Jesus call his Father?","What did Jesus give Judas after dipping it?","What did the sinful woman use to wipe Jesus’ feet?","What question did the rich young ruler ask Jesus?","Which prophet did Jesus say John the Baptist fulfilled?","What two Old Testament texts did Jesus combine when cleansing the temple?","In the soils parable, what does rocky ground lack?","What cloth was folded by itself in Jesus’ empty tomb?","Jesus said Satan demanded to sift the disciples like what?","What two figures appeared with Jesus at the Transfiguration?","What did Jesus say would happen to the temple buildings?","How many years did Israel wander in the wilderness?","What happened to the northern kingdom under Assyria?","What day had fully come when the Spirit was poured out in Acts 2?","How many days did Israel march before Jericho’s wall fell?","How long did Solomon reign over Israel?","About how many were added after Peter’s Pentecost sermon?","What happened when Uzzah touched the ark?","What did Rehoboam’s harsh answer lead Israel to do?","What did Cyrus decree concerning Jerusalem’s temple?","What was cast to choose Matthias over Joseph?","What happened to Ananias and Sapphira after lying?","What did Gideon’s three hundred men break during the attack?","What service problem led to choosing seven men in Acts 6?","What tribe received no land inheritance like the others?","How many years after the exodus did Solomon begin the temple?","What did Nebuzaradan burn after Jerusalem fell?","How many sons of Ahab were killed and sent to Jezreel?","How long did David reign in Hebron before ruling all Israel?","What did Hezekiah do to Moses’ bronze serpent?","What proconsul believed during Paul’s first missionary journey?","What is the beginning of wisdom?","Which book says there is a time for everything?","Which prophet saw the valley of dry bones?","Whose proverbs open the book of Proverbs?","What does Ecclesiastes call “the end of the matter”?","What repeated phrase opens and closes Ecclesiastes?","What sign did Isaiah give to Ahaz?","What did the Lord set in Amos’s vision?","Whom did Hosea marry as the Lord commanded?","In Daniel’s vision, who was the head of gold?","According to Proverbs, what does a soft answer turn away?","What did David ask God to create in him in Psalm 51?","What did Ezekiel eat in his vision?","What did Zechariah see flying in his vision?","How long did Isaiah walk naked and barefoot as a sign?","Name Hosea’s three children.","What did Jeremiah hide near the Euphrates?","Name Job’s three friends who came to comfort him.","How many days did Ezekiel bear Israel’s and Judah’s punishment?","Whose filthy garments were removed in Zechariah’s vision?","What did Peter command the crowd to do in Acts 2:38?","What does Romans 3:23 say all have done?","What does 2 Timothy 3:16 say all Scripture is?","What is the first commandment?","According to Romans 6, baptized believers are baptized into what?","According to Galatians 3:27, what have the baptized put on?","In the Lord’s Supper, what do believers proclaim?","According to Ephesians 4, how many baptisms are there?","In Jeremiah’s new covenant promise, where is God’s law written?","According to Hebrews 11:1, what is faith?","According to 1 John 1:7, what cleanses from all sin?","What should dwell richly in Christians, according to Colossians 3:16?","According to Titus, what does grace train believers to renounce?","According to Hebrews 4, what is living and active?","Why could the law not perfect worshipers, according to Hebrews 10?","In Colossians 2, burial and resurrection are connected to what act?","Why was the Son born under the law, according to Galatians 4?","In 2 Corinthians 3, what gives life?","According to Romans 8, what does the Spirit bear witness with?","According to Ephesians 2, what did Christ break down?","Who confronted David after his sin with Bathsheba?","Who was Ruth’s mother-in-law?","Who was called the son of encouragement?","Who denied Jesus three times before the rooster crowed?","Who was the father of John the Baptist?","Who was Aquila’s wife?","Name Timothy’s mother and grandmother.","Who was a seller of purple goods from Thyatira?","Who brought Saul to the apostles after his conversion?","Who was a servant of the church at Cenchreae?","Who was Paul’s “fellow worker and fellow soldier” in Philippians?","Who took the infant Jesus in his arms and blessed God?","From what tribe was Anna the prophetess?","Who did Paul call his child in the letter to Philemon?","What was the name of Rebekah’s nurse buried near Bethel?","Who was beaten before Gallio’s tribunal in Corinth?","Which two fellow prisoners were well known to the apostles?","Who would tell the Ephesians how Paul was doing?","What man carried Jesus’ cross?","Who joined Korah in rebellion against Moses and Aaron?"]);

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
    const all=Array.isArray(d)?d:[d];
    s.questions=all.filter(q=>APPROVED_QUESTION_TEXTS.has((q.question||'').trim()));
    if(!s.questions.length)throw Error('No reviewed questions found');
    renderCategories();
    show('home');
  }catch(e){
    console.error(e);
    document.querySelector('#errorText').textContent='The reviewed question set could not be loaded.';
    show('error');
  }
}
function renderCategories(){const c={};s.questions.forEach(q=>{const k=(q.category||'Uncategorized').trim();c[k]=(c[k]||0)+1});const box=document.querySelector('#categories');box.innerHTML='';Object.entries(c).sort().forEach(([k,n])=>{const b=document.createElement('button');b.className='category';b.innerHTML=`${k}<span class="count">${n} ${n===1?'question':'questions'}</span>`;b.onclick=()=>{s.category=k;s.seen.clear();nextQuestion()};box.appendChild(b)})}
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
