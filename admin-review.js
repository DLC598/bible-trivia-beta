let reviewHistory=[];
let editorMode='normal';
let editorReturnView='questions';

function reviewQueue(excludeId=''){
  const flagged=questions.filter(q=>q.id!==excludeId&&q.needs_more_work).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  const flaggedIds=new Set(flagged.map(q=>q.id));
  const unreviewed=questions.filter(q=>q.id!==excludeId&&!q.reviewed&&!flaggedIds.has(q.id)).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  return [...flagged,...unreviewed];
}
function reviewLabel(q){
  if(q.needs_more_work)return'<span class="review-status needs-work">Needs More Work</span>';
  if(q.reviewed)return'<span class="review-status reviewed">Reviewed</span>';
  return'<span class="review-status unreviewed">Unreviewed</span>';
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
function renderOverview(){
  questionMetrics();
  const recent=[...questions].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)).slice(0,5);
  $('recentQuestions').innerHTML=recent.length?recent.map(q=>`<div class="question-row"><div><strong>${esc(q.question)}</strong><small>${esc(q.id)} · ${esc(q.category)} · ${esc(q.difficulty)}</small></div>${reviewLabel(q)}</div>`).join(''):'<div class="empty">No questions have been imported yet.</div>';
  $('recentFeedback').innerHTML=feedback.slice(0,5).map(f=>`<div class="feedback-row"><div><strong>${esc(f.comment||((f.vote===1)?'Good question':'Needs attention'))}</strong><small>${esc(f.question_id)} · ${esc((f.issue_tags||[]).join(', ')||'No issue tag')}</small></div><span class="vote ${f.vote===1?'vote-positive':'vote-negative'}">${f.vote===1?'Positive':'Attention'}</span></div>`).join('')||'<div class="empty">No feedback yet.</div>';
  const counts=categoryCounts();
  $('categoryPreview').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="category-pill"><strong>${esc(c)}</strong><span>${n} question${n===1?'':'s'}</span></div>`).join('')||'<div class="empty">Import the current bank to see categories.</div>';
}
function filteredQuestions(){
  const text=$('questionSearch').value.trim().toLowerCase();
  const cat=$('questionCategoryFilter').value;
  const status=$('questionStatusFilter').value;
  const review=$('questionReviewFilter').value;
  return questions.filter(q=>{
    const hay=[q.id,q.question,q.answer,q.reference,q.category,q.difficulty,q.passage_text,q.internal_notes].join(' ').toLowerCase();
    const reviewMatch=review==='all'||(review==='reviewed'&&q.reviewed)||(review==='unreviewed'&&!q.reviewed)||(review==='needs-work'&&q.needs_more_work);
    return(!text||hay.includes(text))&&(cat==='all'||q.category===cat)&&(status==='all'||q.status===status)&&reviewMatch;
  });
}
function renderQuestions(){
  const rows=filteredQuestions();
  $('questionsBody').innerHTML=rows.length?rows.map(q=>`<tr><td><strong>${esc(q.id)}</strong></td><td class="question-cell"><strong>${esc(q.question)}</strong><br><small>${esc(q.answer)}</small></td><td>${esc(q.category)}</td><td>${esc(q.difficulty)}</td><td><span class="status status-${esc(q.status)}">${esc(q.status)}</span></td><td>${reviewLabel(q)}</td><td>${esc(fmtDate(q.updated_at))}</td><td><div class="row-actions"><button class="secondary edit-question" data-id="${esc(q.id)}">Edit</button></div></td></tr>`).join(''):'<tr><td colspan="8" class="empty">No questions match these filters.</td></tr>';
  document.querySelectorAll('.edit-question').forEach(b=>b.onclick=()=>openQuestionDialog(questions.find(q=>q.id===b.dataset.id),'normal'));
}
function renderFeedback(){
  const rows=filteredFeedback();
  $('feedbackBody').innerHTML=rows.length?rows.map(x=>{const tags=(x.issue_tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="tag">None</span>';const options=statuses.map(s=>`<option ${s===x.processing_status?'selected':''}>${s}</option>`).join('');return `<tr><td>${esc(fmtDate(x.submitted_at))}</td><td><strong>${esc(x.question_id)}</strong></td><td><span class="vote ${x.vote===1?'vote-positive':'vote-negative'}">${x.vote===1?'Positive':'Attention'}</span></td><td><div class="tags">${tags}</div></td><td>${esc(x.comment||'')}</td><td><select class="status-select" data-id="${x.feedback_event_id}">${options}</select></td><td><div class="row-actions"><button class="secondary edit-feedback-question" data-question-id="${esc(x.question_id)}">Edit Question</button></div></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">No feedback matches these filters.</td></tr>';
  document.querySelectorAll('.status-select').forEach(el=>el.onchange=()=>saveFeedbackStatus(el));
  document.querySelectorAll('.edit-feedback-question').forEach(b=>b.onclick=()=>{
    const q=questions.find(item=>item.id===b.dataset.questionId);
    if(!q){setMessage(`Question ${b.dataset.questionId} could not be found — it may have been deleted.`);return;}
    openQuestionDialog(q,'normal','feedback');
  });
}
function renderAll(){populateCategoryControls();renderOverview();renderQuestions();renderFeedback();renderCategories()}

function updateEditorQueueText(q){
  const queue=reviewQueue(q?.id||'');
  $('editorQueueText').textContent=editorMode==='review'?`Review queue: ${queue.length+(q?1:0)} remaining. Flagged questions are shown first.`:(q?.reviewed?`Reviewed ${fmtDate(q.reviewed_at)}.`:'Not yet marked reviewed.');
  $('previousQuestionBtn').disabled=!reviewHistory.length;
}
function openQuestionDialog(q=null,mode='normal',returnView='questions'){
  editorMode=mode;
  editorReturnView=returnView;
  $('questionForm').reset();
  $('originalQuestionId').value=q?.id||'';
  $('dialogTitle').textContent=q?'Edit Question':'Add Question';
  $('questionId').value=q?.id||'';
  $('questionCategory').value=q?.category||Object.keys(categoryBanners)[0];
  $('questionDifficulty').value=q?.difficulty||'Medium';
  $('questionStatus').value=q?.status||'Draft';
  $('questionText').value=q?.question||'';
  $('answerText').value=q?.answer||'';
  $('referenceText').value=q?.reference||'';
  $('passageText').value=q?.passage_text||'';
  $('internalNotes').value=q?.internal_notes||'';
  $('questionReviewed').checked=Boolean(q?.reviewed);
  $('questionNeedsWork').checked=Boolean(q?.needs_more_work);
  $('reviewedDateText').textContent=q?.reviewed_at?`Marked reviewed on ${fmtDate(q.reviewed_at)}.`:'';
  $('deleteQuestionBtn').classList.toggle('hidden',!q);
  updateEditorQueueText(q);
  $('saveNextBtn').classList.toggle('hidden',mode!=='review');
  $('questionDialog').showModal();
}
function startReview(){
  const queue=reviewQueue();
  if(!queue.length){setMessage('Every question is reviewed and no questions are flagged for more work.');return;}
  reviewHistory=[];
  showView('questions');
  openQuestionDialog(queue[0],'review');
}
function openPreviousReview(){
  const id=reviewHistory.pop();
  const q=questions.find(x=>x.id===id);
  if(q)openQuestionDialog(q,'review');
}
async function persistQuestion(nextAfterSave=false){
  const original=$('originalQuestionId').value.trim();
  const id=$('questionId').value.trim();
  const existing=questions.find(q=>q.id===original);
  const reviewed=$('questionReviewed').checked;
  const payload={
    id,
    category:$('questionCategory').value,
    difficulty:$('questionDifficulty').value,
    status:$('questionStatus').value,
    question:$('questionText').value.trim(),
    answer:$('answerText').value.trim(),
    reference:$('referenceText').value.trim()||null,
    passage_text:$('passageText').value.trim()||null,
    internal_notes:$('internalNotes').value.trim()||null,
    reviewed,
    reviewed_at:reviewed?(existing?.reviewed_at||new Date().toISOString()):null,
    needs_more_work:$('questionNeedsWork').checked,
    edit_count:(existing?.edit_count||0)+1,
    updated_at:new Date().toISOString()
  };
  if(!id||!payload.question||!payload.answer){setMessage('Question ID, question, and answer are required.');return false;}
  setMessage('Saving question…');
  let error;
  if(original&&original!==id){
    const del=await db.from('questions').delete().eq('id',original);
    if(del.error)error=del.error;else({error}=await db.from('questions').insert(payload));
  }else if(original){({error}=await db.from('questions').update(payload).eq('id',original));}
  else{({error}=await db.from('questions').insert(payload));}
  if(error){setMessage(`Question could not be saved: ${error.message}`);return false;}
  const priorId=original||id;
  await loadData();
  if(nextAfterSave){
    reviewHistory.push(priorId);
    const next=reviewQueue(priorId)[0];
    if(next){openQuestionDialog(next,'review');setMessage('Question saved. Next review question opened.');}
    else{$('questionDialog').close();setMessage('Review queue complete. Every question is reviewed and no questions are flagged for more work.');showView('questions');}
  }else{$('questionDialog').close();setMessage('Question saved.');showView(editorReturnView);}
  return true;
}
async function deleteQuestion(){
  const id=$('originalQuestionId').value.trim();
  if(!id)return;
  const q=questions.find(item=>item.id===id);
  const label=q?.question?`\n\n${q.question}`:'';
  if(!window.confirm(`Permanently delete question ${id}?${label}\n\nThis cannot be undone.`))return;
  $('deleteQuestionBtn').disabled=true;
  setMessage(`Deleting ${id}…`);
  const {error}=await db.from('questions').delete().eq('id',id);
  if(error){
    $('deleteQuestionBtn').disabled=false;
    setMessage(`Question could not be deleted: ${error.message}`);
    return;
  }
  $('questionDialog').close();
  reviewHistory=reviewHistory.filter(historyId=>historyId!==id);
  await loadData();
  setMessage(`Question ${id} was permanently deleted.`);
  showView('questions');
}
async function saveQuestion(e){e.preventDefault();await persistQuestion(false);}

const originalMapRow=mapRow;
mapRow=function(row,index,defaultStatus){
  const mapped=originalMapRow(row,index,defaultStatus);
  mapped.passage_text=firstValue(row,['passagetext','esvtext','scripturetext'])||null;
  mapped.internal_notes=firstValue(row,['internalnotes','notes','editorialnotes'])||null;
  mapped.reviewed=false;
  mapped.reviewed_at=null;
  mapped.needs_more_work=false;
  return mapped;
};
const originalCommitImport=commitImport;
commitImport=async function(){
  const list=importRows.filter(r=>!r.errors.length).map(({id,category,difficulty,question,answer,reference,status,passage_text,internal_notes,reviewed,reviewed_at,needs_more_work})=>({id,category,difficulty,question,answer,reference,status,passage_text,internal_notes,reviewed,reviewed_at,needs_more_work}));
  if(!list.length)return;
  $('commitImportBtn').disabled=true;
  try{
    const chunkSize=200;
    for(let i=0;i<list.length;i+=chunkSize){
      $('importMessage').textContent=`Importing ${Math.min(i+chunkSize,list.length)} of ${list.length}…`;
      const {error}=await db.from('questions').upsert(list.slice(i,i+chunkSize),{onConflict:'id'});
      if(error)throw error;
    }
    $('importMessage').textContent=`Imported ${list.length} questions successfully.`;
    await loadData();
    setTimeout(()=>{closeImportDialog();showView('questions');},700);
  }catch(err){$('importMessage').textContent=`Import failed: ${err.message}`;$('commitImportBtn').disabled=false;}
};

[$('navReview'),$('startReviewBtn'),$('quickReview'),$('questionsReviewBtn')].forEach(b=>b.onclick=startReview);
$('questionForm').onsubmit=saveQuestion;
$('saveNextBtn').onclick=()=>persistQuestion(true);
$('previousQuestionBtn').onclick=openPreviousReview;
$('deleteQuestionBtn').onclick=deleteQuestion;
[$('questionSearch'),$('questionCategoryFilter'),$('questionStatusFilter'),$('questionReviewFilter')].forEach(el=>el.oninput=renderQuestions);
$('commitImportBtn').onclick=commitImport;