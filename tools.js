// 기술별 Dkt 점수: 사용자 제공 개발표 기준
const TECH_GROUPS = [
  {name:'과학', max:300, items:[['A','천문학',30],['B','인쇄연구',60],['C','물질법칙',90],['D','계몽',120]]},
  {name:'종교', max:300, items:[['E','후원',30],['F','면죄부',60],['G','개종',90],['H','대성당',120]]},
  {name:'상업', max:300, items:[['I','카라반',20],['J','풍차와 물레방아',40],['K','농업향상',50],['L','이자와 이윤',80],['M','산업',110]]},
  {name:'통신', max:300, items:[['N','필사본',30],['O','인쇄술',60],['P','예술',90],['Q','르네상스',120]]},
  {name:'탐험', max:400, items:[['R','동방진출',40],['S','외양선',80],['T','원양항해술',120],['U','신세계',160]]},
  {name:'시민', max:500, items:[['V','도시성장',20],['W','민족주의',60],['X','공공연구',100],['Y','세계인',150],['Z','중산층',170]]}
];
const views = {build:document.getElementById('buildView'),income:document.getElementById('incomeView'),score:document.getElementById('scoreView')};
document.querySelectorAll('.bottom-nav__button').forEach(button=>button.addEventListener('click',()=>{
  const selected=button.dataset.view;
  Object.entries(views).forEach(([key,view])=>view.classList.toggle('hidden',key!==selected));
  document.querySelectorAll('.bottom-nav__button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  window.scrollTo({top:0,behavior:'instant'});
}));
const incomePlayers=document.getElementById('incomePlayers');
const territoryCount=document.getElementById('territoryCount');
function calculateIncome(){
  const players=Number(incomePlayers.value);
  const count=Number(territoryCount.value);
  const valid=Number.isSafeInteger(count)&&count>=0;
  document.getElementById('incomeTotal').textContent=valid?`$${(players*count+15).toLocaleString('en-US')}`:'—';
  document.getElementById('incomeFormula').textContent=valid?`${players} × ${count} + $15`:'지배 지역 수는 0 이상의 정수로 입력하세요.';
}
incomePlayers.addEventListener('change',calculateIncome);
territoryCount.addEventListener('input',calculateIncome);
function adjustTerritory(delta) {
  const raw = territoryCount.value.trim();
  const current = raw !== '' && Number.isSafeInteger(Number(raw)) && Number(raw) >= 0 ? Number(raw) : 0;
  territoryCount.value = String(Math.max(0, current + delta));
  calculateIncome();
}
document.getElementById('territoryDecrease').addEventListener('click', () => adjustTerritory(-1));
document.getElementById('territoryIncrease').addEventListener('click', () => adjustTerritory(1));
const techGroups=document.getElementById('techGroups');
techGroups.innerHTML=TECH_GROUPS.map(group=>`<section class="tech-group"><div class="tech-group__head"><h3>${group.name} (${group.max})</h3><span data-group="${group.name}">0 / ${group.max}점</span></div>${group.items.map(([code,name,points])=>`<label class="tech-row"><span class="tech-row__code">${code}</span><span class="tech-row__name">${name}</span><span class="tech-row__points">${points}점</span><input type="checkbox" data-code="${code}" data-group="${group.name}" data-points="${points}" aria-label="${code} ${name} ${points}점 선택"></label>`).join('')}</section>`).join('');
function calculateScore(){
  const checked=[...techGroups.querySelectorAll('input:checked')];
  const total=checked.reduce((sum,item)=>sum+Number(item.dataset.points),0);
  document.getElementById('scoreTotal').textContent=`${total.toLocaleString('ko-KR')}점`;
  document.getElementById('scoreCount').textContent=`${checked.length}개 기술 선택`;
  TECH_GROUPS.forEach(group=>{const subtotal=checked.filter(item=>item.dataset.group===group.name).reduce((sum,item)=>sum+Number(item.dataset.points),0);techGroups.querySelector(`[data-group="${group.name}"]`).textContent=`${subtotal} / ${group.max}점`;});
}
techGroups.addEventListener('change',calculateScore);
document.getElementById('clearScore').addEventListener('click',()=>{techGroups.querySelectorAll('input').forEach(input=>input.checked=false);calculateScore();});
calculateIncome();calculateScore();
