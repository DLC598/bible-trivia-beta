let questionSubmissions=[];

function submissionStatusClass(status='Pending'){
  return `submission-${String(status).toLowerCase().replace(/\s+/g,'-')}`;
}

async function loadQuestionSubmissions(){
  const {data,error}=await db.from('question_submissions').select('*').order('submitted_at',{ascending:false}).limit(1000);
  if(error){
    questionSubmissions=[];
    $('submissionsMessage').textContent=`Submissions could not be loaded: ${error.message}`;
  }else{
    questionSubmissions=data||[];
    $('submissionsMessage').textContent=`Loaded ${questionSubmissions.length} submission${questionSubmissions.length===1?'':'s'}.`;
  }
  renderQuestionSubmissions();
}

function filteredSubmissions(){
  const search=$('submissionSearch').value.trim().toLowerCase();
  const status=$('submissionStatusFilter').value;
  return questionSubmissions.filter(item=>{
    const hay=[item.question,item.answer,item.scripture,item.category,item.difficulty,item.review_note].join(' ').toLowerCase();
    return(!search||hay.includes(search))&&(status==='all'||item.status===status);
  });
}

function renderQuestionSubmissions(){
  const pending=questionSubmissions.filter(x=>x.status==='Pending').length;
  $('submissionBadge').textContent=pending;
  $('submissionTotalMetric').textContent=questionSubmissions.length;
  $('submissionPendingMetric').textContent=pending;
  $('submissionApprovedMetric').textContent=questionSubmissions.filter(x=>x.status==='Approved').length;
  $('submissionRejectedMetric').textContent=questionSubmissions.filter(x=>x.status==='Rejected').length;
  const rows=filteredSubmissions();
  $('submissionsBody').innerHTML=rows.length?rows.map(item=>`<tr>
    <td>${esc(fmtDate(item.submitted_at))}</td>
    <td class="question-cell"><strong>${esc(item.question||'No question supplied')}</strong><br><small>${esc(item.answer||'No answer supplied')}</small></td>
    <td>${esc(item.category||'—')}</td>
    <td>${esc(item.difficulty||'—')}</td>
    <td>${esc(item.scripture||'—')}</td>
    <td><span class="submission-status ${submissionStatusClass(item.status)}">${esc(item.status)}</span></td>
    <td><button class="secondary review-submission" data-id="${esc(item.submission_id)}">Review</button></td>
  </tr>`).join(''):'<tr><td colspan="7" class="empty">No submissions match these filters.</td></tr>';
  document.querySelectorAll('.review-submission').forEach(button=>button.onclick=()=>openSubmissionDialog(button.dataset.id));
}

function showSubmissionsView(){
  document.querySelectorAll('.view').forEach(view=>view.classList.add('hidden'));
  $('submissionsView').classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(button=>button.classList.remove('active'));
  $('navSubmissions').classList.add('active');
  $('pageTitle').textContent='Question Submissions';
  $('pageSubtitle').textContent='Review, edit, approve, or reject questions submitted from the public app.';
  document.querySelector('.sidebar').classList.remove('open');
  loadQuestionSubmissions();
}

function nextQuestionId(){
  const numbers=questions.map(q=>String(q.id||'').match(/(\d+)$/)).filter(Boolean).map(match=>Number(match[1])).filter(Number.isFinite);
  const next=(numbers.length?Math.max(...numbers):0)+1;
  return `BTQ-${String(next).padStart(4,'0')}`;
}

function openSubmissionDialog(id){
  const item=questionSubmissions.find(x=>x.submission_id===id);
  if(!item)return;
  $('submissionId').value=item.submission_id;
  $('submissionQuestionId').value=nextQuestionId();
  $('submissionQuestion').value=item.question||'';
  $('submissionAnswer').value=item.answer||'';
  $('submissionReference').value=item.scripture||'';
  $('submissionCategory').value=item.category||'Doctrine';
  $('submissionDifficulty').value=item.difficulty||'Medium';
  $('submissionReviewNote').value=item.review_note||'';
  $('submissionDialogStatus').textContent=item.status;
  $('approveSubmissionBtn').disabled=item.status==='Approved';
  $('rejectSubmissionBtn').disabled=item.status==='Rejected';
  $('submissionDialog').showModal();
}

function submissionPayload(){
  return{
    question:$('submissionQuestion').value.trim()||null,
    answer:$('submissionAnswer').value.trim()||null,
    scripture:$('submissionReference').value.trim()||null,
    category:$('submissionCategory').value||null,
    difficulty:$('submissionDifficulty').value||null,
    review_note:$('submissionReviewNote').value.trim()||null
  };
}

async function saveSubmissionEdits(){
  const id=$('submissionId').value;
  const payload=submissionPayload();
  $('submissionDialogMessage').textContent='Saving changes…';
  const {error}=await db.from('question_submissions').update(payload).eq('submission_id',id);
  if(error){$('submissionDialogMessage').textContent=`Could not save: ${error.message}`;return false;}
  $('submissionDialogMessage').textContent='Changes saved.';
  await loadQuestionSubmissions();
  return true;
}

async function approveSubmission(){
  const submissionId=$('submissionId').value;
  const id=$('submissionQuestionId').value.trim();
  const question=$('submissionQuestion').value.trim();
  const answer=$('submissionAnswer').value.trim();
  if(!id||!question||!answer){$('submissionDialogMessage').textContent='Question ID, question, and answer are required before approval.';return;}
  const duplicate=questions.find(q=>q.id===id);
  if(duplicate){$('submissionDialogMessage').textContent=`Question ID ${id} already exists. Choose another ID.`;return;}
  $('approveSubmissionBtn').disabled=true;
  $('submissionDialogMessage').textContent='Creating draft question…';
  const questionPayload={
    id,
    category:$('submissionCategory').value,
    difficulty:$('submissionDifficulty').value,
    status:'Draft',
    question,
    answer,
    reference:$('submissionReference').value.trim()||null,
    internal_notes:`Created from public submission ${submissionId}. ${$('submissionReviewNote').value.trim()}`.trim(),
    reviewed:false,
    needs_more_work:false,
    updated_at:new Date().toISOString()
  };
  const {error:insertError}=await db.from('questions').insert(questionPayload);
  if(insertError){$('submissionDialogMessage').textContent=`Question could not be created: ${insertError.message}`;$('approveSubmissionBtn').disabled=false;return;}
  const {error:updateError}=await db.from('question_submissions').update({...submissionPayload(),status:'Approved',reviewed_at:new Date().toISOString()}).eq('submission_id',submissionId);
  if(updateError){$('submissionDialogMessage').textContent=`Draft created, but submission status could not be updated: ${updateError.message}`;return;}
  $('submissionDialog').close();
  await loadData();
  await loadQuestionSubmissions();
  showSubmissionsView();
  setMessage(`Submission approved and added to the Question Bank as Draft ${id}.`);
}

async function rejectSubmission(){
  const id=$('submissionId').value;
  if(!window.confirm('Reject this submitted question? It will remain in the submission history.'))return;
  $('rejectSubmissionBtn').disabled=true;
  $('submissionDialogMessage').textContent='Rejecting submission…';
  const {error}=await db.from('question_submissions').update({...submissionPayload(),status:'Rejected',reviewed_at:new Date().toISOString()}).eq('submission_id',id);
  if(error){$('submissionDialogMessage').textContent=`Could not reject: ${error.message}`;$('rejectSubmissionBtn').disabled=false;return;}
  $('submissionDialog').close();
  await loadQuestionSubmissions();
  showSubmissionsView();
  setMessage('Submission rejected and retained in the review history.');
}

$('navSubmissions').onclick=showSubmissionsView;
$('submissionSearch').oninput=renderQuestionSubmissions;
$('submissionStatusFilter').onchange=renderQuestionSubmissions;
$('refreshSubmissionsBtn').onclick=loadQuestionSubmissions;
$('closeSubmissionDialog').onclick=()=>$('submissionDialog').close();
$('cancelSubmissionDialog').onclick=()=>$('submissionDialog').close();
$('saveSubmissionBtn').onclick=saveSubmissionEdits;
$('approveSubmissionBtn').onclick=approveSubmission;
$('rejectSubmissionBtn').onclick=rejectSubmission;

const loadDataBeforeSubmissions=loadData;
loadData=async function(){
  await loadDataBeforeSubmissions();
  await loadQuestionSubmissions();
};