(function(){
  "use strict";

  // ---------------- state ----------------
  var state = {
    n: 3,
    A: [],
    b: [],
    x0: [],
    x: [],
    history: []
  };

  var EXAMPLES = {
    "2x2": {
      n:2,
      A:[[4,1],[1,3]],
      b:[6,7],
      x0:[0,0]
    },
    "3x3": {
      n:3,
      A:[[10,3,1],[2,15,4],[1,2,20]],
      b:[7,-16,57],
      x0:[0.8,-1.7,2.5]
    },
    "diverge": {
      n:2,
      A:[[1,3],[2,1]],
      b:[5,3],
      x0:[0,0]
    }
  };

  function fmt(num){
    if (!isFinite(num)) return '—';
    var r = Math.round(num * 100000) / 100000;
    if (Object.is(r, -0)) r = 0;
    return r.toString();
  }

  // ---------------- size picker ----------------
  var sizePicker = document.getElementById('size-picker');
  [2,3,4,5].forEach(function(sz){
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = sz;
    b.setAttribute('aria-label', 'Sistema de ' + sz + 'x' + sz);
    b.addEventListener('click', function(){ setSize(sz); });
    b.dataset.size = sz;
    sizePicker.appendChild(b);
  });

  function updateSizeButtons(){
    Array.prototype.forEach.call(sizePicker.children, function(btn){
      btn.classList.toggle('active', parseInt(btn.dataset.size,10) === state.n);
    });
  }

  function setSize(n, preserve){
    state.n = n;
    if (!preserve){
      var newA = [], newB = [], newX0 = [];
      for (var i=0;i<n;i++){
        var row = [];
        for (var j=0;j<n;j++){
          row.push(i===j ? (state.A[i] && state.A[i][j] !== undefined ? state.A[i][j] : 4) : (state.A[i] && state.A[i][j] !== undefined ? state.A[i][j] : 1));
        }
        newA.push(row);
        newB.push(state.b[i] !== undefined ? state.b[i] : 1);
        newX0.push(state.x0[i] !== undefined ? state.x0[i] : 0);
      }
      state.A = newA; state.b = newB; state.x0 = newX0;
    }
    buildForm();
    resetRun();
    updateSizeButtons();
  }

  function loadExample(key){
    var ex = EXAMPLES[key];
    state.n = ex.n;
    state.A = ex.A.map(function(r){ return r.slice(); });
    state.b = ex.b.slice();
    state.x0 = ex.x0.slice();
    buildForm();
    resetRun();
    updateSizeButtons();
    document.getElementById('calculadora').scrollIntoView({behavior:'smooth', block:'start'});
  }
  document.getElementById('preset-2x2').addEventListener('click', function(){ loadExample('2x2'); });
  document.getElementById('preset-3x3').addEventListener('click', function(){ loadExample('3x3'); });
  document.getElementById('preset-diverge').addEventListener('click', function(){ loadExample('diverge'); });
  
  // ---------------- build the input form ----------------
  var formEl = document.getElementById('matrix-form');

  function buildForm(){
    formEl.innerHTML = '';
    var n = state.n;

    for (var i=0;i<n;i++){
      var row = document.createElement('div');
      row.className = 'eq-row';

      for (var j=0;j<n;j++){
        if (j>0){
          var plus = document.createElement('span');
          plus.className = 'eq-op';
          plus.textContent = '+';
          row.appendChild(plus);
        }
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.step = 'any';
        inp.value = state.A[i][j];
        inp.dataset.i = i; inp.dataset.j = j; inp.dataset.role = 'a';
        inp.addEventListener('input', onCoeffChange);
        row.appendChild(inp);

        var subSpan = document.createElement('span');
        subSpan.className = 'sub';
        subSpan.innerHTML = 'x<sub>' + (j+1) + '</sub>';
        row.appendChild(subSpan);
      }

      var eq = document.createElement('span');
      eq.className = 'eq-op';
      eq.textContent = '=';
      row.appendChild(eq);

      var bInp = document.createElement('input');
      bInp.type = 'number';
      bInp.step = 'any';
      bInp.value = state.b[i];
      bInp.dataset.i = i; bInp.dataset.role = 'b';
      bInp.addEventListener('input', onCoeffChange);
      row.appendChild(bInp);

      formEl.appendChild(row);
    }

    var x0Row = document.createElement('div');
    x0Row.className = 'x0-row';
    for (var k=0;k<n;k++){
      var lab = document.createElement('label');
      lab.innerHTML = 'x<sub>' + (k+1) + '</sub><sup>(0)</sup>';
      var x0Inp = document.createElement('input');
      x0Inp.type = 'number';
      x0Inp.step = 'any';
      x0Inp.value = state.x0[k];
      x0Inp.dataset.i = k; x0Inp.dataset.role = 'x0';
      x0Inp.addEventListener('input', onCoeffChange);
      lab.appendChild(x0Inp);
      x0Row.appendChild(lab);
    }
    formEl.appendChild(x0Row);

    onCoeffChange();
  }

  function onCoeffChange(e){
    if (e && e.target){
      var t = e.target;
      var i = parseInt(t.dataset.i, 10);
      var val = parseFloat(t.value);
      if (isNaN(val)) val = 0;
      if (t.dataset.role === 'a'){
        var j = parseInt(t.dataset.j, 10);
        state.A[i][j] = val;
      } else if (t.dataset.role === 'b'){
        state.b[i] = val;
      } else if (t.dataset.role === 'x0'){
        state.x0[i] = val;
      }
    }
    checkDiagonal();
    renderTransformed();
    resetRun();
  }

  function checkDiagonal(){
    var n = state.n;
    var statusEl = document.getElementById('diag-status');
    var zeroDiag = false;
    var dominant = true;
    for (var i=0;i<n;i++){
      if (state.A[i][i] === 0) zeroDiag = true;
      var sum = 0;
      for (var j=0;j<n;j++){ if (j!==i) sum += Math.abs(state.A[i][j]); }
      if (Math.abs(state.A[i][i]) < sum) dominant = false;
    }
    var html = '';
    if (zeroDiag){
      html = '<p class="diag-warning">⚠ Hay un 0 en la diagonal principal. Reordená ecuaciones/incógnitas antes de iterar — no se puede dividir por a<sub>ii</sub> = 0.</p>';
    } else if (!dominant){
      html = '<p class="diag-note">Nota: esta matriz no es diagonalmente dominante. Puede converger igual, pero no está garantizado.</p>';
    }
    statusEl.innerHTML = html;
    formEl.querySelectorAll('input[data-role="a"]').forEach(function(inp){
      var i = parseInt(inp.dataset.i,10), j = parseInt(inp.dataset.j,10);
      inp.classList.toggle('bad', i===j && state.A[i][j] === 0);
    });
    return !zeroDiag;
  }

  function renderTransformed(){
    var n = state.n, A = state.A, b = state.b;
    var out = document.getElementById('transformed-view');
    var lines = [];
    for (var i=0;i<n;i++){
      if (A[i][i] === 0){ lines.push('ecuación ' + (i+1) + ': no se puede normalizar (a' + (i+1) + (i+1) + ' = 0)'); continue; }
      var parts = ['−x' + sub(i+1)];
      for (var j=0;j<n;j++){
        if (j===i) continue;
        var coef = -A[i][j] / A[i][i];
        if (coef === 0) continue;
        var sign = coef >= 0 ? ' + ' : ' − ';
        parts.push(sign + fmt(Math.abs(coef)) + 'x' + sub(j+1));
      }
      var c = b[i] / A[i][i];
      var csign = c >= 0 ? ' + ' : ' − ';
      parts.push(csign + fmt(Math.abs(c)));
      parts.push(' = 0');
      lines.push(parts.join(''));
    }
    out.textContent = lines.join('\n');
  }

  function sub(num){
    var map = {0:'\u2080',1:'\u2081',2:'\u2082',3:'\u2083',4:'\u2084',5:'\u2085',6:'\u2086',7:'\u2087',8:'\u2088',9:'\u2089'};
    return String(num).split('').map(function(d){ return map[d]; }).join('');
  }

  // ---------------- relaxation engine ----------------
  // ¡ACTUALIZADO para usar la lógica del sistema transformado!
  function computeResiduals(A,b,x,n){
    var R = new Array(n);
    var formulas = new Array(n);
    
    for (var i=0;i<n;i++){
      var formulaParts = [];
      
      // Parte de la variable principal: -x_i
      var xiStr = x[i] < 0 ? '(' + fmt(x[i]) + ')' : fmt(x[i]);
      formulaParts.push('-' + xiStr);
      
      var s = 0; // Sumatoria original
      for (var j=0;j<n;j++){ 
        if (j!==i) {
          s += A[i][j]*x[j]; 
          // Calculo el coeficiente del sistema transformado
          var coef_trans = A[i][j] / A[i][i];
          if (coef_trans !== 0) {
            var sign = coef_trans > 0 ? ' - ' : ' + ';
            var xjStr = x[j] < 0 ? '(' + fmt(x[j]) + ')' : fmt(x[j]);
            formulaParts.push(sign + fmt(Math.abs(coef_trans)) + ' × ' + xjStr);
          }
        } 
      }
      
      // Parte del término independiente transformado
      var indep = b[i] / A[i][i];
      var indepSign = indep >= 0 ? ' + ' : ' - ';
      formulaParts.push(indepSign + fmt(Math.abs(indep)));
      
      // El residuo matemático (sin redondeos intermedios)
      var proposed = (b[i]-s)/A[i][i];
      R[i] = proposed - x[i];
      
      // Guardamos el string armadito
      formulas[i] = 'R' + (i+1) + ' = ' + formulaParts.join('') + ' = ' + fmt(R[i]);
    }
    return { R: R, formulas: formulas };
  }

  function stepOnce(){
    var n = state.n;
    var res = computeResiduals(state.A, state.b, state.x, n);
    var R = res.R;
    var formulas = res.formulas;
    
    var maxI = 0;
    for (var i=1;i<n;i++){ if (Math.abs(R[i]) > Math.abs(R[maxI])) maxI = i; }
    
    var before = state.x.slice();
    state.x[maxI] = state.x[maxI] + R[maxI];
    
    state.history.push({
      k: state.history.length,
      xBefore: before,
      R: R,
      formulas: formulas,
      maxI: maxI,
      xAfter: state.x.slice()
    });
    return Math.abs(R[maxI]);
  }

  function resetRun(){
    state.x = state.x0.slice();
    state.history = [];
    renderTable();
    renderVector();
    document.getElementById('status-line').textContent = '';
  }

  function renderVector(){
    var n = state.n;
    var el = document.getElementById('vector-display');
    el.innerHTML = '';
    for (var i=0;i<n;i++){
      var item = document.createElement('div');
      item.className = 'vd-item';
      item.innerHTML = '<span class="k">x' + sub(i+1) + '</span><span class="v">' + fmt(state.x[i]) + '</span>';
      el.appendChild(item);
    }
  }

  function renderTable(){
    var n = state.n;
    var head = document.getElementById('history-head');
    var body = document.getElementById('history-body');
    var headHtml = '<th>k</th>';
    for (var i=0;i<n;i++){ headHtml += '<th>x' + sub(i+1) + '</th><th>R' + sub(i+1) + '</th>'; }
    headHtml += '<th class="cambia-col">Cambia</th>';
    head.innerHTML = headHtml;

    var rows = '';
    state.history.forEach(function(row){
      var tds = '<td>' + row.k + '</td>';
      for (var i=0;i<n;i++){
        var isMax = (i === row.maxI);
        tds += '<td>' + fmt(row.xBefore[i]) + '</td>';
        // Agregamos data-formula en lugar del title nativo
        tds += '<td data-formula="' + row.formulas[i] + '" class="has-tooltip ' + (isMax ? 'max-residual' : '') + '">' + fmt(row.R[i]) + '</td>';
      }
      var varName = 'x' + sub(row.maxI+1);
      var rxMax = row.R[row.maxI] < 0 ? '(' + fmt(row.R[row.maxI]) + ')' : fmt(row.R[row.maxI]);
      tds += '<td class="cambia-col">' + varName + ' = ' + fmt(row.xBefore[row.maxI]) + ' + ' + rxMax + ' = <span class="changed">' + fmt(row.xAfter[row.maxI]) + '</span></td>';
      rows += '<tr>' + tds + '</tr>';
    });
    body.innerHTML = rows;
  }

  // ---------------- buttons ----------------
  document.getElementById('btn-step').addEventListener('click', function(){
    if (!checkDiagonal()) return;
    stepOnce();
    renderTable();
    renderVector();
    document.getElementById('status-line').textContent = 'Iteración ' + state.history.length + ' realizada.';
  });

  document.getElementById('btn-reset').addEventListener('click', function(){
    resetRun();
  });

  document.getElementById('btn-run').addEventListener('click', function(){
    if (!checkDiagonal()) return;
    var n = parseInt(document.getElementById('iter-count').value, 10) || 1;
    n = Math.max(1, Math.min(60, n));
    var autoStop = document.getElementById('auto-stop').checked;
    var converged = false;
    for (var i=0;i<n;i++){
      var maxAbsR = stepOnce();
      if (autoStop && maxAbsR < 1e-6){ converged = true; break; }
    }
    renderTable();
    renderVector();
    var statusEl = document.getElementById('status-line');
    if (converged){
      statusEl.textContent = 'Convergió en la iteración ' + state.history.length + ' (residuo < 1e-6).';
    } else {
      statusEl.textContent = state.history.length + ' iteración(es) realizadas.';
    }
  });

  // ---------------- active nav highlighting ----------------
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('nav.rail a');
  function onScroll(){
    var pos = window.scrollY + 120;
    var current = sections[0] ? sections[0].id : '';
    sections.forEach(function(sec){
      if (sec.offsetTop <= pos) current = sec.id;
    });
    navLinks.forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  // ---------------- Lógica del Tooltip Flotante ----------------
  var tooltipEl = document.getElementById('custom-tooltip');

  document.addEventListener('mouseover', function(e) {
    if (e.target && e.target.classList.contains('has-tooltip')) {
      var formula = e.target.getAttribute('data-formula');
      tooltipEl.innerHTML = formula;
      tooltipEl.classList.add('show');
      
      var rect = e.target.getBoundingClientRect();
      
      // Calculamos para que quede centrado encima de la celda
      var topPos = rect.top + window.scrollY - tooltipEl.offsetHeight - 8;
      var leftPos = rect.left + window.scrollX + (rect.width / 2) - (tooltipEl.offsetWidth / 2);
      
      tooltipEl.style.top = topPos + 'px';
      tooltipEl.style.left = leftPos + 'px';
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (e.target && e.target.classList.contains('has-tooltip')) {
      tooltipEl.classList.remove('show');
    }
  });

  // ---------------- init ----------------
  loadExample('3x3');
  onScroll();
})();