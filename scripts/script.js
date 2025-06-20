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
function processInputText(inputText) {
    let inputObj;
    try {
        inputObj = JSON.parse(inputText);
    } catch (e) {
        return { error: 'JSON inválido' };
    }
    if (!inputObj.content) return { error: 'Formato inválido: campo content não encontrado' };
    const outputArr = inputObj.content.map(transformUser);
    return { outputArr };
}

// Evento do botão Executar
$(document).ready(function() {
  $('#run-btn').on('click', function() {
    const inputText = $('#input-area').val();
    const result = processInputText(inputText);
    const outputContainer = document.getElementById('output-container');
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
        return;
    }
    result.outputArr.forEach((user, idx) => {
        const block = createOutputBlock(JSON.stringify(user, null, 4), idx, user.fullName);
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
