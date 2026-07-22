function filteredFeedback(){const q=$('feedbackSearch').value.trim().toLowerCase(),vote=$('voteFilter').value,status=$('statusFilter').value;return feedback.filter(x=>{const text=[x.question_id,(x.issue_tags||[]).join(' '),x.comment||''].join(' ').toLowerCase();return(!q||text.includes(q))&&(vote==='all'||String(x.vote)===vote)&&(status==='all'||x.processing_status===status)})}
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
async function saveFeedbackStatus(el){el.disabled=true;setMessage('Saving feedback status…');const {error}=await db.from('feedback_events').update({processing_status:el.value}).eq('feedback_event_id',el.dataset.id);if(error){setMessage(`Status update failed: ${error.message}`);el.disabled=false;return}const row=feedback.find(x=>x.feedback_event_id===el.dataset.id);if(row)row.processing_status=el.value;setMessage('Feedback status saved.');el.disabled=false;renderOverview()}

[$('feedbackSearch'),$('voteFilter'),$('statusFilter')].forEach(el=>el.oninput=renderFeedback);
