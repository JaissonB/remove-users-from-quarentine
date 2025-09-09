// SVG do botão de copiar (global para reutilização)
const COPY_BTN_SVG = `<svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="10" height="10" rx="2" fill="#1976d2"/><rect x="3" y="3" width="10" height="10" rx="2" fill="#90caf9"/></svg>`;

// Função para copiar o conteúdo do textarea de saída ao clicar no botão
$(document).ready(function() {
  $('#copy-btn').on('click', function() {
    const output = $('#output-area');
    output[0].select();
    output[0].setSelectionRange(0, 99999); // Para mobile
    document.execCommand('copy');
    // Feedback visual rápido
    $(this).attr('title', 'Copiado!');
    setTimeout(() => $(this).attr('title', 'Copiar saída'), 1200);
  });
  
  // Botão de copiar para o textarea de ignorar
  $('#ignore-copy-btn').on('click', function() {
    const ignoreArea = $('#ignore-area');
    ignoreArea[0].select();
    ignoreArea[0].setSelectionRange(0, 99999);
    document.execCommand('copy');
    $(this).attr('title', 'Copiado!');
    setTimeout(() => $(this).attr('title', 'Copiar conteúdo'), 1200);
  });
});

// Função para transformar o usuário conforme a regra de negócio
function transformUser(user) {
    user.status = 'PENDING';
    if (user.attributes && user.attributes.status) {
        user.attributes.status = ['PENDING'];
    }
    user.userAccountQuarentine = null;
    user.sectors = [
        {
            sectorCode: 'BONUS',
            permissions: ['BONUS_B2C']
        }
    ];
    return user;
}

// Função utilitária para criar um bloco de saída expansível
function createOutputBlock(content, idx, fullName) {
    const details = document.createElement('details');
    details.className = 'output-details';
    // Permitir apenas um aberto por vez
    details.addEventListener('toggle', function(e) {
        if (details.open) {
            // Fecha todos os outros details abertos
            document.querySelectorAll('.output-details[open]').forEach(function(openDetails) {
                if (openDetails !== details) {
                    openDetails.removeAttribute('open');
                }
            });
        }
    });
    // Por padrão, fechado
    const summary = document.createElement('summary');
    summary.textContent = fullName ? fullName : `Usuário ${idx + 1}`;
    const textarea = document.createElement('textarea');
    textarea.className = 'output-area';
    textarea.rows = 10;
    textarea.readOnly = true;
    textarea.value = content;
    // Botão de copiar
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.title = 'Copiar saída';
    copyBtn.innerHTML = COPY_BTN_SVG;
    copyBtn.onclick = function(e) {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        copyBtn.title = 'Copiado!';
        setTimeout(() => copyBtn.title = 'Copiar saída', 1200);
    };
    // Wrapper para textarea e botão
    const wrapper = document.createElement('div');
    wrapper.className = 'textarea-wrapper';
    wrapper.appendChild(textarea);
    wrapper.appendChild(copyBtn);
    details.appendChild(summary);
    details.appendChild(wrapper);
    return details;
}

// Função para processar o texto de entrada e retornar o array de saída
function processInputText(inputText, ignoreIds) {
    let inputObj;
    try {
        inputObj = JSON.parse(inputText);
    } catch (e) {
        return { error: 'JSON inválido' };
    }
    if (!inputObj.content) return { error: 'Formato inválido: campo content não encontrado' };
    
    // Filtra usuários que não estão na lista de IDs a ignorar
    const filteredContent = inputObj.content.filter(user => {
        return !ignoreIds.includes(user.id);
    });
    
    const outputArr = filteredContent.map(transformUser);
    return { outputArr, inputObj };
}

// Evento do botão Executar
$(document).ready(function() {
  $('#run-btn').on('click', function() {
    const inputText = $('#input-area').val();
    const ignoreText = $('#ignore-area').val().trim();
    const ignoreIds = ignoreText ? ignoreText.split(/\s+/) : [];
    const result = processInputText(inputText, ignoreIds);
    const outputContainer = document.getElementById('output-container');
    const summaryArea = $('#summary-area');
    
    // Mantenha o label "Saída" sempre
    outputContainer.innerHTML = '<label for="output-area">Casos ajustados</label>';
    
    if (result.error) {
        // Mostra erro em um textarea único
        const textarea = document.createElement('textarea');
        textarea.className = 'output-area';
        textarea.rows = 5;
        textarea.readOnly = true;
        textarea.value = result.error;
        outputContainer.appendChild(textarea);
        summaryArea.val(`Erro: ${result.error}`);
        return;
    }
    
    // Atualiza o resumo
    const totalInput = result.inputObj.content.length;
    const totalOutput = result.outputArr.length;
    const totalInitial = result.inputObj.content.filter(user => user.idpId != null).length;
    const inputIds = result.inputObj.content.map(user => user.id).join(' ');
    
    // Cria conteúdo HTML para o resumo
    const initialStyle = totalInitial > 0 ? 'style="color: #d32f2f; font-weight: bold;"' : '';
    const summaryHTML = `
        <div>Casos de entrada: ${totalInput}</div>
        <div>Casos de saída: ${totalOutput}</div>
        <div ${initialStyle}>Casos em INITIAL: ${totalInitial}</div>
        <div>IDs: ${inputIds}</div>
    `;
    
    // Substitui o textarea por um div
    summaryArea.replaceWith(`<div id="summary-area" class="summary-content">${summaryHTML}</div>`);
    const newSummaryArea = $('#summary-area');
    
    // Mostra o campo de resumo
    $('.summary-group').show();
    
    // Não precisa ajustar altura para div
    result.outputArr.forEach((user, idx) => {
        const userJson = JSON.stringify(user, null, 4);
        const block = createOutputBlock(userJson, idx, user.fullName);
        
        // Encontra o usuário original correspondente pelo ID
        const originalUser = result.inputObj.content.find(original => original.id === user.id);
        if (originalUser && originalUser.idpId != null) {
            block.classList.add('has-idp');
        }
        
        outputContainer.appendChild(block);
    });
    // Adiciona textarea fixo com saída unificada
    const unifiedOutput = result.outputArr.map(user => {
        // Extrai os campos no formato do output.txt
        // username    email    cpf    phone    cnpj
        return [
            user.username || 'null',
            user.email || 'null',
            user.cpf || 'null',
            user.phone || 'null',
            user.cnpj || 'null'
        ].join('    ');
    }).join('\n\n');
    const unifiedWrapper = document.createElement('div');
    unifiedWrapper.className = 'textarea-wrapper';
    unifiedWrapper.style.display = 'block'; // Garante que o label fique acima
    // Adiciona o label acima do textarea unificado
    const unifiedLabel = document.createElement('label');
    unifiedLabel.textContent = 'Mandar para análise';
    unifiedLabel.setAttribute('for', 'unified-output-area');
    unifiedLabel.className = 'textarea-group-output-label'; // Adiciona classe para estilização
    unifiedLabel.style.display = 'block';
    unifiedLabel.style.marginBottom = '4px';
    unifiedWrapper.appendChild(unifiedLabel);
    // Wrapper para textarea e botão de copiar
    const unifiedTextareaWrapper = document.createElement('div');
    unifiedTextareaWrapper.style.position = 'relative';
    unifiedTextareaWrapper.style.width = '100%';
    // Textarea
    const unifiedTextarea = document.createElement('textarea');
    unifiedTextarea.className = 'output-area output-area-unified';
    unifiedTextarea.rows = 8;
    unifiedTextarea.readOnly = true;
    unifiedTextarea.value = unifiedOutput;
    unifiedTextarea.id = 'unified-output-area';
    // Botão de copiar para o textarea unificado
    const unifiedCopyBtn = document.createElement('button');
    unifiedCopyBtn.type = 'button';
    unifiedCopyBtn.className = 'copy-btn';
    unifiedCopyBtn.title = 'Copiar saída';
    unifiedCopyBtn.innerHTML = COPY_BTN_SVG;
    unifiedCopyBtn.style.position = 'absolute';
    unifiedCopyBtn.style.top = '10px';
    unifiedCopyBtn.style.right = '10px';
    unifiedCopyBtn.onclick = function(e) {
        unifiedTextarea.select();
        unifiedTextarea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        unifiedCopyBtn.title = 'Copiado!';
        setTimeout(() => unifiedCopyBtn.title = 'Copiar saída', 1200);
    };
    unifiedTextareaWrapper.appendChild(unifiedTextarea);
    unifiedTextareaWrapper.appendChild(unifiedCopyBtn);
    unifiedWrapper.appendChild(unifiedTextareaWrapper);
    outputContainer.appendChild(unifiedWrapper);
  });
});

// Adiciona estilo para o botão de copiar
const style = document.createElement('style');
style.innerHTML = `
.copy-btn {
    border: 1px solid #222;
    border-radius: 8px;
    background: #f5f5f5;
    padding: 6px 8px;
    margin-left: 8px;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    outline: none;
    display: flex;
    align-items: center;
    position: absolute;
    top: 10px;
    right: 10px;
}
.copy-btn:hover {
    background: #e3f2fd;
}
.copy-btn:active {
    background: #bbdefb;
}
.copy-btn svg {
    display: block;
}
`;
document.head.appendChild(style);
