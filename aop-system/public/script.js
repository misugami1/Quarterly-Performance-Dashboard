const API = ''; // relative, same origin

/* ===== UTILITIES ===== */
function showPage(id) {
  document.querySelectorAll('.page, #page-login').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'flex';
    el.classList.add('active');
  }
  window.scrollTo(0,0);
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

function showLoading(v) {
  document.getElementById('loading').style.display = v ? 'flex' : 'none';
}

function formatDate(d) {
    if (!d) return '—';
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-PH', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function esc(s) { 
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
}

// Smart Math Helper! Extracts numbers from text like "25%" or ignores "N/A"
function parseQValue(val) {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
  return isNaN(num) ? 0 : num;
}

// Custom Fetch Helper that automatically adds the Auth Token
async function apiFetch(url, opts={}) {
  showLoading(true);
  try {
    const token = localStorage.getItem('aop_token');
    const headers = { ...opts.headers };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (opts.body && typeof opts.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(API + url, { ...opts, headers });
    
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) throw new Error(data?.message || data?.error || 'Server error');
    return data;
  } finally {
    showLoading(false);
  }
}


/* ===== AUTH (REAL BACKEND) ===== */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value.trim();
  const errEl = document.getElementById('login-error');
  
  errEl.classList.remove('show');
  if (!email || !pass) { 
    errEl.classList.add('show'); 
    errEl.textContent='Please fill in all fields.'; 
    return; 
  }

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    
    localStorage.setItem('aop_token', data.token);
    showPage('page-home');
    initCreateForm();
    showToast('Logged in successfully', 'success');
  } catch(e) {
    errEl.classList.add('show');
    errEl.textContent = e.message;
  }
}

async function doRegister() {
  const name  = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const pass  = document.getElementById('register-password').value.trim();
  const errEl = document.getElementById('register-error');

  errEl.classList.remove('show');
  if (!name || !email || !pass) {
    errEl.classList.add('show');
    errEl.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass })
    });
    showToast('Account created! Please log in.');
    showPage('page-login');
  } catch (err) {
    errEl.classList.add('show');
    errEl.textContent = err.message;
  }
}

function logout() {
  localStorage.removeItem('aop_token');
  showPage('page-login');
}


/* ===== CREATE & UPDATE FORM ===== */
let rowCount = 1;
let currentPlanId = null; 

function initCreateForm(planData=null, editMode=false) {
  rowCount = planData ? planData.rows.length : 1;
  currentPlanId = planData ? planData._id : null;
  const container = document.getElementById('create-content');
  const title = editMode ? 'Manage & Update Records' : 'Create New Operational Plan';
  const btnLabel = editMode ? 'Update Record' : 'Save Record';
  const saveFn = editMode ? 'updatePlan()' : 'savePlan()';

  let rowsHtml = '';
  const rows = planData ? planData.rows : [newRowData()];
  rows.forEach((r, i) => { rowsHtml += buildRowHtml(i+1, rows.length, r); });

  container.innerHTML = `
  <div class="page-title">${title}</div>
  <div class="form-card">
    <table class="aop-table" id="aop-form-table">
      <thead>
        <tr>
          <th>Development Area</th>
          <th>Outcome</th>
          <th colspan="2">Strategy</th>
          <th>ID No.</th>
        </tr>
      </thead>
      <tbody id="plan-header-body">
        <tr>
          <td><input type="text" id="f-devarea" value="${esc(planData?.developmentArea||'')}" placeholder="Development Area"/></td>
          <td><input type="text" id="f-outcome" value="${esc(planData?.outcome||'')}" placeholder="Outcome"/></td>
          <td colspan="2"><input type="text" id="f-strategy" value="${esc(planData?.strategy||'')}" placeholder="Strategy"/></td>
          <td style="text-align:center;font-weight:700;color:var(--red);" id="id-display">${planData ? planData.idNo : 'Auto'}</td>
        </tr>
      </tbody>
    </table>

    <div id="rows-container">
      ${rowsHtml}
    </div>

    <div style="padding:10px 14px;background:#fff8f0;">
      <button class="btn-file" onclick="${editMode ? 'addRowInUpdate()' : 'addRow()'}">+ Add Row</button>
      <span style="font-size:0.75rem;color:var(--text-muted);margin-left:10px;">Each row = separate PAP entry</span>
    </div>

    <div class="form-footer">
      <button class="btn-secondary" onclick="showPage('${editMode ? 'page-records' : 'page-home'}')">🏠 Back</button>
      <button class="btn-save" onclick="${saveFn}">${btnLabel}</button>
    </div>
  </div>`;
}

function newRowData() {
  return {pap:'', perfIndicator:'', targetQ1:'', targetQ2:'', targetQ3:'', targetQ4:'',
          actualQ1:'', actualQ2:'', actualQ3:'', actualQ4:'',
          officeConcerned:'', totalEstCost:'', fundSource:'', risk:'', riskAssessment:'',
          mitigatingActivities:'', proofFile:'', rowNo:1};
}

function buildRowHtml(rowNo, total, r={}) {
  return `
  <div class="dynamic-row" id="row-block-${rowNo}" data-rowno="${rowNo}">
    <table class="aop-table" style="border-top:2px solid #e0e0e0;">
      <tbody>
        <tr class="section-header">
          <td colspan="2"><span class="row-section-label">Programs, Activities and Project (PAPs)</span></td>
          <td colspan="2"><span class="row-section-label">Performance Indicator</span></td>
          <td>
            <div class="row-controls">
              <span class="row-num-display">${rowNo}</span>
              <button class="btn-row-ctrl" onclick="moveRow(${rowNo},-1)" title="Move Up">▲</button>
              <button class="btn-row-ctrl" onclick="moveRow(${rowNo},1)" title="Move Down">▼</button>
              ${total > 1 ? `<button class="btn-row-ctrl" style="background:#e53935;" onclick="removeRow(${rowNo})" title="Remove">✕</button>` : ''}
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2"><textarea id="r${rowNo}-pap" rows="2" placeholder="Programs, Activities and Project">${esc(r.pap||'')}</textarea></td>
          <td colspan="2"><textarea id="r${rowNo}-perfindicator" rows="2" placeholder="Performance Indicator">${esc(r.perfIndicator||'')}</textarea></td>
          <td></td>
        </tr>
        <tr class="center-header">
          <td colspan="5" style="text-align:center;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:var(--orange);background:#fff8f0;">
            Quarterly Targets vs Actuals
          </td>
        </tr>
        <tr class="section-header">
          <td><span class="row-section-label">Target Q1</span></td>
          <td><span class="row-section-label">Target Q2</span></td>
          <td><span class="row-section-label">Target Q3</span></td>
          <td colspan="2"><span class="row-section-label">Target Q4</span></td>
        </tr>
        <tr>
          <td><input type="text" id="r${rowNo}-tq1" value="${esc(r.targetQ1||'')}" placeholder="0 or N/A"/></td>
          <td><input type="text" id="r${rowNo}-tq2" value="${esc(r.targetQ2||'')}" placeholder="0 or N/A"/></td>
          <td><input type="text" id="r${rowNo}-tq3" value="${esc(r.targetQ3||'')}" placeholder="0 or N/A"/></td>
          <td colspan="2"><input type="text" id="r${rowNo}-tq4" value="${esc(r.targetQ4||'')}" placeholder="0 or N/A"/></td>
        </tr>
        <tr class="section-header">
          <td><span class="row-section-label">Actual Q1</span></td>
          <td><span class="row-section-label">Actual Q2</span></td>
          <td><span class="row-section-label">Actual Q3</span></td>
          <td colspan="2"><span class="row-section-label">Actual Q4</span></td>
        </tr>
        <tr>
          <td><input type="text" id="r${rowNo}-aq1" value="${esc(r.actualQ1||'')}" placeholder="0 or N/A"/></td>
          <td><input type="text" id="r${rowNo}-aq2" value="${esc(r.actualQ2||'')}" placeholder="0 or N/A"/></td>
          <td><input type="text" id="r${rowNo}-aq3" value="${esc(r.actualQ3||'')}" placeholder="0 or N/A"/></td>
          <td colspan="2"><input type="text" id="r${rowNo}-aq4" value="${esc(r.actualQ4||'')}" placeholder="0 or N/A"/></td>
        </tr>
        <tr class="section-header">
          <td><span class="row-section-label">Office Concerned</span></td>
          <td><span class="row-section-label">Total Est. Cost</span></td>
          <td><span class="row-section-label">Fund Source</span></td>
          <td><span class="row-section-label">Risk</span></td>
          <td><span class="row-section-label">Risk Assessment</span></td>
        </tr>
        <tr>
          <td><input type="text" id="r${rowNo}-officeConcerned" value="${esc(r.officeConcerned||'')}" placeholder="Office Concerned"/></td>
          <td><input type="number" id="r${rowNo}-estcost" value="${r.totalEstCost||''}" placeholder="0.00"/></td>
          <td><input type="text" id="r${rowNo}-fundsource" value="${esc(r.fundSource||'')}" placeholder="Fund Source"/></td>
          <td><input type="text" id="r${rowNo}-risk" value="${esc(r.risk||'')}" placeholder="Risk"/></td>
          <td><input type="text" id="r${rowNo}-riskAssessment" value="${esc(r.riskAssessment||'')}" placeholder="Risk Assessment"/></td>
        </tr>
        <tr class="section-header">
          <td colspan="2"><span class="row-section-label">Mitigating Activities</span></td>
          <td colspan="3"><span class="row-section-label">Upload Proof / Evidence</span></td>
        </tr>
        <tr>
          <td colspan="2"><textarea id="r${rowNo}-mitigating" rows="2" placeholder="Mitigating Activities">${esc(r.mitigatingActivities||'')}</textarea></td>
          <td colspan="3">
            <div class="file-upload-area">
              <input type="file" id="r${rowNo}-file" style="display:none;" onchange="fileSelected(${rowNo},this)" accept="image/*,application/pdf"/>
              <button class="btn-file" onclick="document.getElementById('r${rowNo}-file').click()">Choose File</button>
              <span class="file-name-display" id="r${rowNo}-fname">${r.proofFile ? r.proofFile : 'No File Chosen'}</span>
              ${r.proofFile ? `<a href="${r.proofFile}" target="_blank" style="font-size:0.75rem;color:var(--red);font-weight:600;">[ View ]</a>` : ''}   
            </div>
            <input type="hidden" id="r${rowNo}-existingfile" value="${esc(r.proofFile||'')}"/>
          </td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function fileSelected(rowNo, input) {
  const name = input.files[0] ? input.files[0].name : 'No File Chosen';
  document.getElementById('r' + rowNo + '-fname').textContent = name;
}

function addRow() {
  rowCount++;
  const cont = document.getElementById('rows-container');
  const div = document.createElement('div');
  div.innerHTML = buildRowHtml(rowCount, rowCount, newRowData());
  cont.appendChild(div.firstElementChild);
}

function removeRow(rowNo) {
  const el = document.getElementById('row-block-' + rowNo);
  if (el) el.remove();
}

function moveRow(rowNo, dir) { /* simplified: just scrolls */ }

function collectFormData() {
  const devArea = document.getElementById('f-devarea')?.value.trim();
  const outcome = document.getElementById('f-outcome')?.value.trim();
  const strategy = document.getElementById('f-strategy')?.value.trim();
  if (!devArea || !outcome || !strategy) { showToast('Please fill in Development Area, Outcome and Strategy.','error'); return null; }

  const rows = [];
  document.querySelectorAll('#rows-container .dynamic-row').forEach(block => {
    const n = block.dataset.rowno;
    rows.push({
      rowNo: parseInt(n),
      pap: document.getElementById('r'+n+'-pap')?.value.trim()||'',
      perfIndicator: document.getElementById('r'+n+'-perfindicator')?.value.trim()||'',
      targetQ1: document.getElementById('r'+n+'-tq1')?.value.trim()||'',
      targetQ2: document.getElementById('r'+n+'-tq2')?.value.trim()||'',
      targetQ3: document.getElementById('r'+n+'-tq3')?.value.trim()||'',
      targetQ4: document.getElementById('r'+n+'-tq4')?.value.trim()||'',
      actualQ1: document.getElementById('r'+n+'-aq1')?.value.trim()||'',
      actualQ2: document.getElementById('r'+n+'-aq2')?.value.trim()||'',
      actualQ3: document.getElementById('r'+n+'-aq3')?.value.trim()||'',
      actualQ4: document.getElementById('r'+n+'-aq4')?.value.trim()||'',
      officeConcerned: document.getElementById('r'+n+'-officeConcerned')?.value.trim()||'',
      totalEstCost: parseFloat(document.getElementById('r'+n+'-estcost')?.value)||0,
      fundSource: document.getElementById('r'+n+'-fundsource')?.value.trim()||'',
      risk: document.getElementById('r'+n+'-risk')?.value.trim()||'',
      riskAssessment: document.getElementById('r'+n+'-riskAssessment')?.value.trim()||'',
      mitigatingActivities: document.getElementById('r'+n+'-mitigating')?.value.trim()||'',
      existingProof: document.getElementById('r'+n+'-existingfile')?.value||'',
      _fileInput: document.getElementById('r'+n+'-file')
    });
  });

  if (rows.length === 0) {
    showToast('Please add at least one row before saving.', 'error');
    return null;
  }

  return { developmentArea: devArea, outcome, strategy, rows };
}


/* ===== SAVING & UPDATING DATA (REAL BACKEND) ===== */
async function savePlan() {
  const data = collectFormData();
  if (!data) return;
  
  try {
    const formData = new FormData();
    formData.append('developmentArea', data.developmentArea);
    formData.append('outcome', data.outcome);
    formData.append('strategy', data.strategy);
    
    const rowsPayload = data.rows.map(r => ({ ...r, _fileInput: undefined }));
    formData.append('rows', JSON.stringify(rowsPayload));
    
    data.rows.forEach(r => {
      if (r._fileInput && r._fileInput.files[0]) {
        formData.append(`file_row_${r.rowNo}`, r._fileInput.files[0]);
      }
    });

    await apiFetch('/api/plans', { method: 'POST', body: formData });
    
    showToast('Plan saved successfully!', 'success');
    showPage('page-records');
    loadRecords();
  } catch (e) {
    showToast('Error saving: ' + e.message, 'error');
  }
}

async function updatePlan() {
  const data = collectFormData();
  if (!data) return;
  
  try {
    const formData = new FormData();
    formData.append('developmentArea', data.developmentArea);
    formData.append('outcome', data.outcome);
    formData.append('strategy', data.strategy);
    
    const rowsPayload = data.rows.map(r => ({ ...r, _fileInput: undefined }));
    formData.append('rows', JSON.stringify(rowsPayload));
    
    data.rows.forEach(r => {
      if (r._fileInput && r._fileInput.files[0]) {
        formData.append(`file_row_${r.rowNo}`, r._fileInput.files[0]);
      }
    });

    await apiFetch(`/api/plans/${currentPlanId}`, { method: 'PUT', body: formData });
    
    showToast('Record updated successfully!', 'success');
    showPage('page-records');
    loadRecords();
  } catch (e) {
    showToast('Error updating: ' + e.message, 'error');
  }
}

async function deletePlan(id) {
  if (!confirm("Are you sure you want to delete this entire plan? This action cannot be undone.")) return;
  
  try {
    await apiFetch(`/api/plans/${id}`, { method: 'DELETE' });
    showToast('Plan deleted successfully!', 'success');
    
    if (document.getElementById('page-records').classList.contains('active')) {
      loadRecords();
    } else if (document.getElementById('page-dashboard').classList.contains('active')) {
      showDashboardAll();
    }
  } catch (e) {
    showToast('Error deleting plan: ' + e.message, 'error');
  }
}

/* ===== RECORDS TABLE (REAL BACKEND) ===== */
async function loadRecords() {
  const cont = document.getElementById('records-content');
  cont.innerHTML = '<div class="page-title">Manage & Update Records</div><div style="padding:20px;color:#888;">Loading…</div>';
  
  try {
    const plans = await apiFetch('/api/plans');
    
    if (!plans || !plans.length) {
      cont.innerHTML = `<div class="page-title">Manage & Update Records</div>
        <div style="background:#ffff;border-radius:8px;padding:40px;text-align:center;color:var(--text-muted);">
          No records found. <a href="#" onclick="showPage('page-create');initCreateForm()" style="color:var(--red);font-weight:600;">Create your first plan.</a>
        </div>`;
      return;
    }
    
    let rows = '';
    plans.forEach(p => {
      const totalTargetQ = (p.rows || []).reduce((s,r) => s + parseQValue(r.targetQ1) + parseQValue(r.targetQ2) + parseQValue(r.targetQ3) + parseQValue(r.targetQ4), 0);
      const totalActualQ = (p.rows || []).reduce((s,r) => s + parseQValue(r.actualQ1) + parseQValue(r.actualQ2) + parseQValue(r.actualQ3) + parseQValue(r.actualQ4), 0);
      const rowCountDisplay = p.rows ? p.rows.length : 0;
      const firstPap = p.rows && p.rows.length > 0 ? p.rows[0].pap : '—';

      rows += `<tr>
        <td class="id-cell">${p.idNo}</td>
        <td><span class="badge">${rowCountDisplay}</span></td>
        <td>${p.developmentArea}</td>
        <td>${p.outcome}</td>
        <td>${p.strategy}</td>
        <td>${firstPap}</td>
        <td style="text-align:center;font-weight:700;">${totalTargetQ}</td>
        <td style="text-align:center;font-weight:700;color:var(--orange);">${totalActualQ}</td>
        <td>
          <div class="action-links">
            <button class="btn-action btn-view" onclick="showDashboardSingle('${p._id}')">[ VIEW ]</button>
            <button class="btn-action btn-update" onclick="openUpdate('${p._id}')">[ UPDATE ]</button>
            <button class="btn-action" style="background:#c62828; color:#fff;" onclick="deletePlan('${p._id}')">[ DELETE ]</button>
          </div>
        </td>
        <td style="white-space:nowrap;">${formatDate(p.createdAt)}</td>
        <td style="white-space:nowrap;">${formatDate(p.updatedAt)}</td>
      </tr>`;
    });
    
    cont.innerHTML = `<div class="page-title">Manage & Update Records</div>
      <div class="form-card" style="overflow:auto;">
        <table class="records-table">
          <thead><tr>
            <th>ID No.</th><th>Total Row</th><th>Development Area</th>
            <th>Outcome</th><th>Strategy</th><th>PAPs</th>
            <th>Total Target Q</th><th>Total Actual Q</th><th>Actions</th><th>Last Created</th><th>Last Updated</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch(e) {
    cont.innerHTML = `<div class="page-title">Manage & Update Records</div><div style="color:var(--red);padding:20px;">Error: ${e.message}</div>`;
  }
}

async function openUpdate(id) {
  try {
    const plan = await apiFetch(`/api/plans/${id}`);
    if (!plan) return;
    
    showPage('page-update');
    initCreateForm(plan, true); 
    
    const createCont = document.getElementById('create-content');
    const updateCont = document.getElementById('update-content');
    updateCont.innerHTML = createCont.innerHTML;
    createCont.innerHTML = ''; 
  } catch(e) {
    showToast('Error loading plan: ' + e.message, 'error');
  }
}

function addRowInUpdate() {
  rowCount++;
  const cont = document.querySelector('#page-update #rows-container');
  const div = document.createElement('div');
  div.innerHTML = buildRowHtml(rowCount, rowCount, newRowData());
  cont.appendChild(div.firstElementChild);
}


/* ===== DASHBOARD (REAL BACKEND) ===== */
async function loadDashboard() {
  const cont = document.getElementById('dashboard-content');
  cont.innerHTML = '<div style="padding:30px;color:#888;">Loading dashboard…</div>';
  
  try {
    const plans = await apiFetch('/api/plans');

    if (!plans || !plans.length) {
      cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">No plans found.</div>';
      return;
    }
    
    let html = '';
    plans.forEach(plan => {
      if (!plan.rows || plan.rows.length === 0) return; 

      const rowsToShow = [plan.rows[0]]; 
      rowsToShow.forEach((row, index) => {
        const ri = 0; 
        
        const totalTarget = parseQValue(row.targetQ1) + parseQValue(row.targetQ2) + parseQValue(row.targetQ3) + parseQValue(row.targetQ4);
        const totalActual = parseQValue(row.actualQ1) + parseQValue(row.actualQ2) + parseQValue(row.actualQ3) + parseQValue(row.actualQ4);
        
        let tPct = 0;
        let aPct = 0;
        let hasData = false;

        if (totalTarget > 0) {
          tPct = Math.round((totalActual / totalTarget) * 100);
          aPct = Math.max(0, 100 - tPct);
          hasData = true;
        } else if (totalActual > 0) {
          tPct = 100;
          aPct = 0;
          hasData = true;
        }

        const canvasId = `donut-${plan._id}-${ri}`;
        const subtotal = plan.rows.reduce((s,r)=>s+(r.totalEstCost||0),0);
        
        const showViewAllBtn = plan.rows.length > 1;

        html += `
        <div class="dashboard-card" data-planid="${plan._id}">
          <div class="dash-card-header">
            <span>FY 2026 Annual Operational Plan · College of Engineering Alangilan Campus</span>
            <span class="dash-id-badge">ID NO. ${plan.idNo}</span>
            <span class="dash-id-badge">ROW NO. ${ri+1}</span>
          </div>
          <table class="aop-table" style="border-bottom:1px solid #eee;">
            <thead><tr>
              <th>Development Area</th><th>Outcome</th><th>Strategy</th><th>PAPs</th><th>Performance Indicator</th>
            </tr></thead>
            <tbody><tr>
              <td>${esc(plan.developmentArea)}</td>
              <td>${esc(plan.outcome)}</td>
              <td>${esc(plan.strategy)}</td>
              <td>${esc(row.pap)}</td>
              <td>${esc(row.perfIndicator)}</td>
            </tr></tbody>
          </table>
          <div class="dash-card-body">
            <div class="dash-left">
              <div style="font-size:0.72rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Actual vs Target</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px;">Total Quarter (Q1+Q2+Q3+Q4)</div>
              <div class="donut-wrap">
                <canvas id="${canvasId}" data-hasdata="${hasData}" data-actual="${tPct}" data-target="${aPct}"></canvas>
                <div class="donut-center">
                  <div class="pct">${hasData ? tPct + '%' : 'N/A'}</div>
                  <div class="lbl">${hasData ? 'Actual' : 'No Data'}</div>
                </div>
              </div>
              <div class="donut-legend">
                <span><span class="legend-dot" style="background:${hasData ? '#f9a825' : '#e0e0e0'};"></span>Actual ${hasData ? tPct+'%' : 'N/A'}</span>
                <span><span class="legend-dot" style="background:${hasData ? '#212121' : '#e0e0e0'};"></span>Target ${hasData ? aPct+'%' : 'N/A'}</span>
              </div>
              ${row.proofFile ? `<div class="proof-link"><br/><strong style="font-size:0.72rem;color:var(--text-muted);">PROOF/EVIDENCE</strong><br/><a href="${row.proofFile}" target="_blank">[ VIEW ]</a></div>` : `<div style="margin-top:10px;font-size:0.72rem;color:var(--text-muted);">No proof uploaded</div>`}
            </div>
            <div class="dash-right">
              <div class="dash-info-grid">
                <div class="dash-info-item">
                  <div class="dash-info-label">Office Concerned</div>
                  <div class="dash-info-value">${esc(row.officeConcerned)||'—'}</div>
                </div>
                <div class="dash-info-item">
                  <div class="dash-info-label">Total Est. Cost</div>
                  <div class="dash-info-value">₱${(row.totalEstCost||0).toLocaleString()}</div>
                </div>
                <div class="dash-info-item">
                  <div class="dash-info-label">Fund Source</div>
                  <div class="dash-info-value">${esc(row.fundSource)||'—'}</div>
                </div>
                <div class="dash-info-item">
                  <div class="dash-info-label">Risk</div>
                  <div class="dash-info-value">${esc(row.risk)||'—'}</div>
                </div>
                <div class="dash-info-item" style="grid-column:1/-1;">
                  <div class="dash-info-label">Mitigating Activities</div>
                  <div class="dash-info-value">${esc(row.mitigatingActivities)||'—'}</div>
                </div>
                <div class="dash-info-item">
                  <div class="dash-info-label">Risk Assessment</div>
                  <div class="dash-info-value">${esc(row.riskAssessment)||'—'}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="dash-footer">
            ${showViewAllBtn ? `<button class="btn-dash-action" onclick="showDashboardSingle('${plan._id}')">View All ${plan.rows.length} Rows</button>` : ''}
            <button class="btn-dash-action" onclick="printPlan('${plan._id}')">Print</button>
            <button class="btn-dash-action" onclick="openUpdate('${plan._id}')">Manage/Update</button>
            <button class="btn-dash-action" style="background:#c62828; border-color:#c62828; color:#fff;" onclick="deletePlan('${plan._id}')">Delete</button>
          </div>
        </div>`;
      });
    });
    cont.innerHTML = html;
    
    document.querySelectorAll('#dashboard-content canvas[id^="donut-"]').forEach(canvas => {
      const hasData = canvas.getAttribute('data-hasdata') === 'true';
      const actual = parseInt(canvas.getAttribute('data-actual'));
      const target = parseInt(canvas.getAttribute('data-target'));
      drawDonut(canvas.id, actual, target, hasData);
    });

  } catch(e) {
    cont.innerHTML = `<div style="color:var(--red);padding:20px;">Error: ${e.message}</div>`;
  }
}

function showDashboardAll() {
  showPage('page-dashboard');
  loadDashboard();
}

async function showDashboardSingle(id) {
  showPage('page-dashboard');
  await loadDashboardSingle(id);
}

async function loadDashboardSingle(id) {
  const cont = document.getElementById('dashboard-content');
  cont.innerHTML = '<div style="padding:30px;color:#888;">Loading plan details…</div>';
  
  try {
    const plan = await apiFetch(`/api/plans/${id}`);
    
    if (!plan || !plan.rows || plan.rows.length === 0) {
      cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Plan not found or has no rows.</div>';
      return;
    }

    let html = `
      <div style="margin-bottom: 16px;">
        <button class="btn-secondary" style="background:var(--red); color:#fff; border:none;" onclick="showDashboardAll()">◀ Back to All Plans</button>
      </div>
    `;

      plan.rows.forEach((row, ri) => {
      const totalTarget = parseQValue(row.targetQ1) + parseQValue(row.targetQ2) + parseQValue(row.targetQ3) + parseQValue(row.targetQ4);
      const totalActual = parseQValue(row.actualQ1) + parseQValue(row.actualQ2) + parseQValue(row.actualQ3) + parseQValue(row.actualQ4);
      
      let tPct = 0;
      let aPct = 0;
      let hasData = false;

      if (totalTarget > 0) {
        tPct = Math.round((totalActual / totalTarget) * 100);
        aPct = Math.max(0, 100 - tPct);
        hasData = true;
      } else if (totalActual > 0) {
        tPct = 100;
        aPct = 0;
        hasData = true;
      }

      const canvasId = `donut-single-${plan._id}-${ri}`; 
      const subtotal = plan.rows.reduce((s,r)=>s+(r.totalEstCost||0),0);
      const isLastRow = (ri === plan.rows.length - 1);

      html += `
      <div class="dashboard-card" data-planid="${plan._id}">
        <div class="dash-card-header">
          <span>FY 2026 Annual Operational Plan · College of Engineering Alangilan Campus</span>
          <span class="dash-id-badge">ID NO. ${plan.idNo}</span>
          <span class="dash-id-badge">ROW NO. ${ri+1}</span>
        </div>
        <table class="aop-table" style="border-bottom:1px solid #eee;">
          <thead><tr>
            <th>Development Area</th><th>Outcome</th><th>Strategy</th><th>PAPs</th><th>Performance Indicator</th>
          </tr></thead>
          <tbody><tr>
            <td>${esc(plan.developmentArea)}</td>
            <td>${esc(plan.outcome)}</td>
            <td>${esc(plan.strategy)}</td>
            <td>${esc(row.pap)}</td>
            <td>${esc(row.perfIndicator)}</td>
          </tr></tbody>
        </table>
        <div class="dash-card-body">
          <div class="dash-left">
            <div style="font-size:0.72rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Actual vs Target</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px;">Total Quarter (Q1+Q2+Q3+Q4)</div>
            <div class="donut-wrap">
              <canvas id="${canvasId}" data-hasdata="${hasData}" data-actual="${tPct}" data-target="${aPct}"></canvas>
              <div class="donut-center">
                <div class="pct">${hasData ? tPct + '%' : 'N/A'}</div>
                <div class="lbl">${hasData ? 'Actual' : 'No Data'}</div>
              </div>
            </div>
            <div class="donut-legend">
              <span><span class="legend-dot" style="background:${hasData ? '#f9a825' : '#e0e0e0'};"></span>Actual ${hasData ? tPct+'%' : 'N/A'}</span>
              <span><span class="legend-dot" style="background:${hasData ? '#212121' : '#e0e0e0'};"></span>Target ${hasData ? aPct+'%' : 'N/A'}</span>
            </div>
            ${row.proofFile ? `<div class="proof-link"><br/><strong style="font-size:0.72rem;color:var(--text-muted);">PROOF/EVIDENCE</strong><br/><a href="${row.proofFile}" target="_blank">[ VIEW ]</a></div>` : `<div style="margin-top:10px;font-size:0.72rem;color:var(--text-muted);">No proof uploaded</div>`}
          </div> <div class="dash-right">
            <div class="dash-info-grid">
              <div class="dash-info-item">
                <div class="dash-info-label">Office Concerned</div>
                <div class="dash-info-value">${esc(row.officeConcerned)||'—'}</div>
              </div>
              <div class="dash-info-item">
                <div class="dash-info-label">Total Est. Cost</div>
                <div class="dash-info-value">₱${(row.totalEstCost||0).toLocaleString()}</div>
              </div>
              <div class="dash-info-item">
                <div class="dash-info-label">Fund Source</div>
                <div class="dash-info-value">${esc(row.fundSource)||'—'}</div>
              </div>
              <div class="dash-info-item">
                <div class="dash-info-label">Risk</div>
                <div class="dash-info-value">${esc(row.risk)||'—'}</div>
              </div>
              <div class="dash-info-item" style="grid-column:1/-1;">
                <div class="dash-info-label">Mitigating Activities</div>
                <div class="dash-info-value">${esc(row.mitigatingActivities)||'—'}</div>
              </div>
              <div class="dash-info-item">
                <div class="dash-info-label">Risk Assessment</div>
                <div class="dash-info-value">${esc(row.riskAssessment)||'—'}</div>
              </div>
            </div>
            ${isLastRow ? `<div class="dash-subtotal">SUBTOTAL: <span>₱${subtotal.toLocaleString()}</span> (Sum Est. Cost)</div>` : ''}
          </div>
        </div>
        ${isLastRow ? `
        <div class="dash-footer">
          <button class="btn-dash-action" onclick="printPlan('${plan._id}')">Print</button>
          <button class="btn-dash-action" onclick="openUpdate('${plan._id}')">Manage/Update</button>
          <button class="btn-dash-action" style="background:#c62828; border-color:#c62828; color:#fff;" onclick="deletePlan('${plan._id}')">Delete</button>
        </div>` : ''}
      </div>`;
    });
    
    cont.innerHTML = html;
    
    document.querySelectorAll('#dashboard-content canvas[id^="donut-single-"]').forEach(canvas => {
      const hasData = canvas.getAttribute('data-hasdata') === 'true';
      const actual = parseInt(canvas.getAttribute('data-actual'));
      const target = parseInt(canvas.getAttribute('data-target'));
      drawDonut(canvas.id, actual, target, hasData);
    });

  } catch(e) {
    cont.innerHTML = `<div style="color:var(--red);padding:20px;">Error: ${e.message}</div>`;
  }
}

/* ===== CHARTS & PRINT ===== */
function drawDonut(id, actual, target, hasData = true) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  
  const chartData = hasData ? [actual, Math.max(target, 0)] : [1];
  const chartColors = hasData ? ['#f9a825', '#212121'] : ['#e0e0e0']; // Turns gray if no data

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: hasData ? ['Actual', 'Target'] : ['No Data'],
      datasets:[{ data: chartData, backgroundColor: chartColors, borderWidth:0 }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 700 }
    }
  });
}

function printPlan(planId) {
  const allCards = document.querySelectorAll('.dashboard-card');
  allCards.forEach(card => {
    if (card.getAttribute('data-planid') !== planId) {
      card.classList.add('hide-for-print');
    }
  });

  window.print();

  allCards.forEach(card => {
    card.classList.remove('hide-for-print');
  });
}

/* ===== INIT ===== */
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('aop_token');
  if (token) {
    showPage('page-home');
    initCreateForm();
  } else {
    document.getElementById('page-login').style.display = 'flex';
  }
  document.getElementById('login-password')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
});