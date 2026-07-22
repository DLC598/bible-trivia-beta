function openImportDialog(){
  importRows=[];workbook=null;$('importFile').value='';$('importSheet').innerHTML='<option>First available sheet</option>';$('importSheet').disabled=true;$('analyzeImportBtn').disabled=true;$('importResults').classList.add('hidden');$('importMessage').textContent='';$('importDialog').showModal();
}
function closeImportDialog(){$('importDialog').close()}
function mapRow(row,index,defaultStatus){
  const id=firstValue(row,['id','questionid','questionnumber','qid']);
  const question=firstValue(row,['question','questiontext','prompt']);
  const answer=firstValue(row,['answer','answertext','correctanswer']);
  const category=firstValue(row,['category','topic'])||'Uncategorized';
  const rawDifficulty=firstValue(row,['difficulty','level'])||'Medium';
  const difficulty=allowedDifficulties.find(d=>d.toLowerCase()===rawDifficulty.toLowerCase())||rawDifficulty;
  const reference=firstValue(row,['reference','scripturereference','scripture','biblereference','verse']);
  const rawStatus=firstValue(row,['status','publicationstatus']);
  const status=['Draft','Published','Retired'].find(s=>s.toLowerCase()===rawStatus.toLowerCase())||defaultStatus;
  const passage_text=firstValue(row,['passagetext','esvtext','scripturetext'])||null;
  const internal_notes=firstValue(row,['internalnotes','notes','editorialnotes'])||null;
  const errors=[];const warnings=[];
  if(!id)errors.push('Missing ID');if(!question)errors.push('Missing question');if(!answer)errors.push('Missing answer');if(!allowedDifficulties.includes(difficulty))errors.push(`Invalid difficulty: ${rawDifficulty}`);if(!reference)warnings.push('Missing Scripture reference');
  return{row:index+2,id,question,answer,category,difficulty,reference:reference||null,status,passage_text,internal_notes,reviewed:false,reviewed_at:null,needs_more_work:false,errors,warnings};
}
function validateImport(rawRows){
  const mapped=rawRows.map((r,i)=>mapRow(r,i,$('importStatus').value));
  const ids=new Map(),qa=new Map();
  mapped.forEach(r=>{if(r.id){ids.set(r.id,(ids.get(r.id)||0)+1)}const key=`${r.question}`.trim().toLowerCase()+'|'+`${r.answer}`.trim().toLowerCase();if(r.question&&r.answer)qa.set(key,(qa.get(key)||0)+1)});
  mapped.forEach(r=>{if(r.id&&ids.get(r.id)>1)r.errors.push('Duplicate ID in file');const key=`${r.question}`.trim().toLowerCase()+'|'+`${r.answer}`.trim().toLowerCase();if(r.question&&r.answer&&qa.get(key)>1)r.warnings.push('Possible duplicate question and answer');if(r.id&&questions.some(q=>q.id===r.id))r.warnings.push('Existing ID will be updated')});
  return mapped;
}
function displayImportResults(rows){
  importRows=rows;const valid=rows.filter(r=>!r.errors.length),warnings=rows.filter(r=>r.warnings.length),blocked=rows.filter(r=>r.errors.length);
  $('importRows').textContent=rows.length;$('importValid').textContent=valid.length;$('importWarnings').textContent=warnings.length;$('importBlocked').textContent=blocked.length;
  const issueCounts={};rows.flatMap(r=>[...r.errors,...r.warnings]).forEach(x=>issueCounts[x]=(issueCounts[x]||0)+1);
  $('importSummary').innerHTML=Object.keys(issueCounts).length?Object.entries(issueCounts).map(([k,n])=>`<span>${esc(k)}: <strong>${n}</strong></span>`).join(''):'<span class="validation-ok">All rows passed validation.</span>';
  $('importPreviewBody').innerHTML=rows.slice(0,100).map(r=>`<tr><td>${r.row}</td><td><strong>${esc(r.id||'—')}</strong></td><td>${esc(r.question||'—')}</td><td>${esc(r.category)}</td><td>${esc(r.difficulty)}</td><td><span class="import-result ${r.errors.length?'blocked':r.warnings.length?'warning':'valid'}">${r.errors.length?esc(r.errors.join('; ')):r.warnings.length?esc(r.warnings.join('; ')):'Valid'}</span></td></tr>`).join('');
  $('commitImportBtn').disabled=!valid.length;$('commitImportBtn').textContent=`Import ${valid.length} Valid Question${valid.length===1?'':'s'}`;$('importResults').classList.remove('hidden');$('importMessage').textContent=rows.length>100?'Preview shows the first 100 rows. All valid rows will be imported.':'';
}
async function readSelectedFile(){
  const file=$('importFile').files[0];if(!file)return;
  $('importMessage').textContent='Reading file…';
  try{
    const ext=file.name.split('.').pop().toLowerCase();
    if(ext==='json'){const raw=JSON.parse(await file.text());displayImportResults(validateImport(Array.isArray(raw)?raw:[raw]));return}
    if(!window.XLSX)throw new Error('The Excel reader did not load. Refresh and try again.');
    const data=await file.arrayBuffer();workbook=XLSX.read(data,{type:'array'});
    $('importSheet').innerHTML=workbook.SheetNames.map(n=>`<option>${esc(n)}</option>`).join('');$('importSheet').disabled=false;
    analyzeWorkbookSheet();
  }catch(err){$('importMessage').textContent=`Could not read file: ${err.message}`}
}
function analyzeWorkbookSheet(){if(!workbook)return;const sheet=workbook.Sheets[$('importSheet').value||workbook.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(sheet,{defval:''});displayImportResults(validateImport(raw))}
async function analyzeCurrentLiveBank(){
  $('importMessage').textContent='Loading current live question bank…';
  try{
    const {data,error}=await db.from('questions').select('*').order('updated_at',{ascending:false}).limit(5000);
    if(error)throw error;
    displayImportResults(validateImport(data||[]));
  }catch(err){$('importMessage').textContent=`Could not load live bank: ${err.message}`}
}
async function commitImport(){
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
}
function exportPublished(){const data=questions.filter(q=>q.status==='Published').map(({id,category,difficulty,question,answer,reference})=>({id,category,difficulty,question,answer,reference}));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='questions.json';a.click();URL.revokeObjectURL(url);setMessage(`Exported ${data.length} published questions.`)}

[$('navImport'),$('importBtn'),$('questionsImportBtn')].forEach(b=>b.onclick=openImportDialog);
$('closeImportDialog').onclick=$('cancelImportBtn').onclick=closeImportDialog;
$('importFile').onchange=()=>{$('analyzeImportBtn').disabled=!$('importFile').files.length;if($('importFile').files.length)readSelectedFile()};
$('analyzeImportBtn').onclick=readSelectedFile;
$('importSheet').onchange=analyzeWorkbookSheet;
$('importLiveBankBtn').onclick=analyzeCurrentLiveBank;
$('commitImportBtn').onclick=commitImport;
$('exportBtn').onclick=exportPublished;
