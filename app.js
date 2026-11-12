const FACTIONS_BY_PLAYERS = {
    4: ['베니스(베네치아)', '제노바', '바르셀로나', '파리'],
    5: ['베니스(베네치아)', '제노바', '바르셀로나', '파리', '런던'],
    6: ['베니스(베네치아)', '제노바', '바르셀로나', '파리', '런던', '함부르크']
};
const FACTION_ALIASES = {
    '베니스': '베니스(베네치아)',
    '베네치아': '베니스(베네치아)',
    '베니스(베네치아)': '베니스(베네치아)',
    '제노아': '제노바',
    '제노바': '제노바',
    '바르셀로나': '바르셀로나',
    '파리': '파리',
    '런던': '런던',
    '함부르크': '함부르크'
};
function canonicalFaction(name) {
    const value = String(name || '').trim();
    return FACTION_ALIASES[value] || value;
}
const state = {
    rows: [],
    players: null,
    city: '',
    card: '',
    selectedRow: null
};
const els = {
    playerButtons: document.querySelectorAll('#playerButtons button'),
    cityGroup: document.getElementById('cityGroup'),
    citySelect: document.getElementById('citySelect'),
    cardGroup: document.getElementById('cardGroup'),
    cardList: document.getElementById('cardList'),
    recommendButton: document.getElementById('recommendButton'),
    selectorsPanel: document.getElementById('selectorsPanel'),
    resultPanel: document.getElementById('resultPanel'),
    summaryGrid: document.getElementById('summaryGrid'),
    buildTitle: document.getElementById('buildTitle'),
    turnsContent: document.getElementById('turnsContent'),
    generalNoteBlock: document.getElementById('generalNoteBlock'),
    generalNoteContent: document.getElementById('generalNoteContent'),
    resetButton: document.getElementById('resetButton'),
    errorPanel: document.getElementById('errorPanel'),
    errorMessage: document.getElementById('errorMessage'),
    progressItems: document.querySelectorAll('.progress__item')
};
init();
async function init() {
    try {
        const apiUrl = window.APP_CONFIG?.API_URL;
        if (!apiUrl || apiUrl.includes('PASTE_YOUR')) {
            throw new Error(
                'config.js의 API_URL에 Apps Script 웹 앱 주소를 입력하세요.'
            );
        }
        const response = await fetch(
            `${apiUrl}?action=list`,
            { cache: 'no-store' }
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!payload.ok) {
            throw new Error(
                payload.message || '시트 데이터를 읽을 수 없습니다.'
            );
        }
        state.rows = (payload.data || [])
            .map(normalizeRow)
            .filter(Boolean);
        if (!state.rows.length) {
            throw new Error(
                'WEB_DATA 탭에 사용할 데이터가 없습니다.'
            );
        }
    } catch (error) {
        console.error('초기화 오류:', error);
        showError(error.message);
    }
}
function normalizeRow(row) {
    const players = Number(row.players);
    const city = canonicalFaction(row.city);
    const startCard = String(row.start_card || '').trim();
    if (![4, 5, 6].includes(players) || !city || !startCard) {
        return null;
    }
    return {
        players,
        city,
        start_card: startCard,
        card_note: clean(row.card_note),
        build_title: clean(row.build_title) || '추천 빌드',
        turn1_bid: clean(row.turn1_bid),
        turn1_tech: clean(row.turn1_tech),
        turn1_area: clean(row.turn1_area),
        turn1_note: clean(row.turn1_note),
        turn2_bid: clean(row.turn2_bid),
        turn2_tech: clean(row.turn2_tech),
        turn2_area: clean(row.turn2_area),
        turn2_note: clean(row.turn2_note),
        turn3_bid: clean(row.turn3_bid),
        turn3_tech: clean(row.turn3_tech),
        turn3_area: clean(row.turn3_area),
        turn3_note: clean(row.turn3_note),
        general_note: clean(row.general_note),
        active:
            String(row.active ?? 'TRUE').toUpperCase() !== 'FALSE'
    };
}
els.playerButtons.forEach(button => {
    button.addEventListener('click', () => {
        state.players = Number(button.dataset.value);
        state.city = '';
        state.card = '';
        els.playerButtons.forEach(btn => btn.classList.toggle('selected', btn === button));
        renderCities();
        renderCards();
        updateProgress(2);
        updateRecommendState();
    });
});
els.citySelect.addEventListener('change', () => {
    state.city = els.citySelect.value;
    state.card = '';
    renderCards();
    updateProgress(state.city ? 3 : 2);
    updateRecommendState();
});
els.recommendButton.addEventListener('click', showRecommendation);
els.resetButton.addEventListener('click', resetSelections);
function renderCities() {
    // 팩션은 인원수에 따라 고정한다.
    // 4인: 기본 4팩션 / 5인: 런던 추가 / 6인: 함부르크 추가
    const allowedFactions = FACTIONS_BY_PLAYERS[state.players] || [];
    // WEB_DATA에 실제 추천 데이터가 등록된 팩션만 활성화한다.
    const availableFactions = new Set(
        state.rows
            .filter(r => r.active && r.players === state.players)
            .map(r => canonicalFaction(r.city))
    );
    els.citySelect.innerHTML =
        '<option value="">팩션을 선택하세요</option>' +
        allowedFactions.map(faction => {
            const available = availableFactions.has(faction);
            return `
                <option
                    value="${escapeHtml(faction)}"
                    ${available ? '' : 'disabled'}
                >
				${escapeHtml(faction === '베니스(베네치아)' ? '베니스' : faction)}
				${available ? '' : ' (데이터 준비 중)'}
                </option>
            `;
        }).join('');
    els.citySelect.disabled =
        allowedFactions.length === 0;
    els.cityGroup.classList.toggle(
        'is-disabled',
        allowedFactions.length === 0
    );
}
function renderCards() {
    // 같은 start_card라도 행이 다르면 각각 별도의 선택지로 표시한다.
    const matchedRows = state.rows.filter(row =>
        row.active &&
        row.players === state.players &&
        row.city === state.city
    );
    state.card = '';
    state.selectedRow = null;
    if (matchedRows.length === 0) {
        els.cardList.innerHTML = `
      <div class="empty-note">
        등록된 초기 카드가 없습니다.
      </div>
    `;
        els.recommendButton.disabled = true;
        return;
    }
    els.cardList.innerHTML = matchedRows.map((row, index) => {
        const rowId = state.rows.indexOf(row);
        return `
	  <button
	    type="button"
	    class="card-option"
	    data-row-id="${rowId}"
	  >
	    <div>
	      <strong>${escapeHtml(row.start_card)}</strong>
	      ${row.card_note
                ? `<span>${escapeHtml(row.card_note)}</span>`
                : ''
            }
	    </div>
	  </button>
	`;
    }).join('');
    document
        .querySelectorAll('.card-option')
        .forEach(button => {
            button.addEventListener('click', event => {
                const selectedButton =
                    event.currentTarget;
                const rowId =
                    Number(selectedButton.dataset.rowId);
                const selectedRow =
                    state.rows[rowId];
                if (!selectedRow) {
                    return;
                }
                // 기존 선택 표시 제거
                document
                    .querySelectorAll('.card-option')
                    .forEach(item =>
                        item.classList.remove('selected')
                    );
                // 현재 선택 표시
                selectedButton.classList.add('selected');
                // 선택된 행 자체를 저장
                state.selectedRow = selectedRow;
                state.card = selectedRow.start_card;
                els.recommendButton.disabled = false;
                updateProgress(3);
            });
        });
}
function showRecommendation() {
    const row = state.selectedRow;
    if (!row) {
        showError('선택한 초기 카드의 추천 데이터를 찾을 수 없습니다.');
        return;
    }
    els.summaryGrid.innerHTML = [
        ['인원수', `${state.players}인`],
        ['팩션', state.city === '베니스(베네치아)' ? '베니스' : state.city],
        ['초기 카드', row.start_card]
    ].map(([label, value]) => `
        <div class="summary-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `).join('');
    els.buildTitle.textContent =
        row.build_title || '추천 빌드';
    const turns = [1, 2, 3]
        .map(turnNumber =>
            getTurnData(row, turnNumber)
        )
        .filter(turn => turn.hasData);
    els.turnsContent.innerHTML = turns.length
        ? turns.map(renderTurn).join('')
        : '<div class="empty-note">등록된 턴별 빌드가 없습니다.</div>';
    if (row.general_note) {
        els.generalNoteContent.textContent =
            row.general_note;
        els.generalNoteBlock.classList.remove('hidden');
    } else {
        els.generalNoteContent.textContent = '';
        els.generalNoteBlock.classList.add('hidden');
    }
    els.selectorsPanel.classList.add('hidden');
    els.resultPanel.classList.remove('hidden');
    els.errorPanel.classList.add('hidden');
    updateProgress(4);
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
function getTurnData(row, turnNumber) {
    const turn = {
        number: turnNumber,
        bid: row[`turn${turnNumber}_bid`] || '',
        tech: row[`turn${turnNumber}_tech`] || '',
        area: row[`turn${turnNumber}_area`] || '',
        note: row[`turn${turnNumber}_note`] || ''
    };
    turn.hasData = Boolean(
        turn.bid ||
        turn.tech ||
        turn.area ||
        turn.note
    );
    return turn;
}
function renderTurn(turn) {
    const hasValue = value =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== '';
    const multiline = value =>
        escapeHtml(String(value))
            .replace(/\r\n|\r|\n/g, '<br>');
    const renderField = (label, value, type) => {
        if (!hasValue(value)) return '';
        if (type === 'bid') {
            return `
                <div class="turn-field turn-field--bid">
                    <div class="turn-field__label">${label}</div>
                    <div class="turn-field__value">
                        ${multiline(value)}
                    </div>
                </div>
            `;
        }
        if (type === 'area') {
            const areas = String(value)
                .split(/\r\n|\r|\n/)
                .map(v => v.trim())
                .filter(Boolean);
            return `
                <div class="turn-field turn-field--area">
                    <div class="turn-field__label">${label}</div>
                    <div class="territory-list">
                        ${areas.map(area => `
                            <div class="territory-item">
                                ${escapeHtml(area)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        return `
            <div class="turn-field turn-field--${type}">
                <div class="turn-field__label">${label}</div>
                <div class="turn-field__value">
                    ${multiline(value)}
                </div>
            </div>
        `;
    };
    return `
        <section class="turn-card">
            <div class="turn-card__header">
                <span class="turn-number">
                    ${escapeHtml(String(turn.number))}
                </span>
                <h4>${escapeHtml(String(turn.number))}턴</h4>
            </div>
            <div class="turn-fields">
                <div class="turn-fields__main">
                    ${renderField('비딩', turn.bid, 'bid')}
                    ${renderField('기술개발', turn.tech, 'tech')}
                </div>
                ${renderField('영토확장', turn.area, 'area')}
                ${renderField('턴 주석', turn.note, 'note')}
            </div>
        </section>
    `;
}
function resetSelections() {
    state.players = null;
    state.city = '';
    state.card = '';
    state.selectedRow = null;
    els.playerButtons.forEach(btn => btn.classList.remove('selected'));
    els.citySelect.innerHTML = '<option value="">팩션을 선택하세요</option>';
    els.citySelect.disabled = true;
    els.cityGroup.classList.add('is-disabled');
    els.cardGroup.classList.add('is-disabled');
    els.cardList.innerHTML = '<div class="empty-note">인원수와 팩션을 먼저 선택하세요.</div>';
    els.recommendButton.disabled = true;
    els.resultPanel.classList.add('hidden');
    els.selectorsPanel.classList.remove('hidden');
    updateProgress(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateRecommendState() {
    els.recommendButton.disabled = !(state.players && state.city && state.card);
}
function updateProgress(step) {
    els.progressItems.forEach(item => {
        item.classList.toggle('active', Number(item.dataset.step) <= step);
    });
}
function showError(message) {
    els.errorMessage.textContent = message;
    els.errorPanel.classList.remove('hidden');
}
function unique(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ko'));
}
function uniqueBy(values, keyFn) {
    const map = new Map();
    values.forEach(value => {
        const key = keyFn(value);
        if (!map.has(key)) map.set(key, value);
    });
    return [...map.values()].sort((a, b) => keyFn(a).localeCompare(keyFn(b), 'ko'));
}
function clean(value) {
    return String(value ?? '').trim();
}
function formatMultiline(value) {
    return escapeHtml(value)
        .replace(/\r?\n/g, '<br>');
}
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", "&#039;");
}
