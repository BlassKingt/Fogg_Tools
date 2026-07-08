export const ANCHOR_PROMPTS_STORAGE_KEY = 'fogg-tools-anchor-prompts-state-v1';

export const ANCHOR_PERIODS = [
  { id: 'before-work', label: '到公司之前', hint: '起床后、洗漱、出门、通勤路上发生的事。' },
  { id: 'before-lunch', label: '午饭前', hint: '上午工作中稳定发生的事。' },
  { id: 'midday', label: '中午', hint: '午饭、午休或中午固定流程里的事。' },
  { id: 'afternoon', label: '午后', hint: '下午较稳定的会议、饮水、休息或切换动作。' },
  { id: 'leaving-work', label: '下班时', hint: '收尾、离开工位、通勤开始时发生的事。' },
  { id: 'after-work', label: '下班后', hint: '回家、晚饭、洗澡、家务或休闲前后的事。' },
  { id: 'before-bed', label: '睡前', hint: '上床前和睡前固定发生的事。' },
];

export const ANCHOR_STEPS = [
  { id: 'timeline', label: '时间轴', title: '绘制习惯时间轴' },
  { id: 'micro', label: '微习惯配方', title: '创建微习惯配方' },
  { id: 'pearl', label: '珍珠习惯', title: '创建珍珠习惯' },
  { id: 'result', label: '结果', title: '今日实践时间轴' },
];

export function createInitialAnchorState() {
  return {
    step: 'timeline',
    habits: ANCHOR_PERIODS.reduce((acc, period) => {
      acc[period.id] = [];
      return acc;
    }, {}),
    selectedAnchors: [],
    microDraft: {
      anchorId: '',
      candidates: ['', '', ''],
      selectedCandidate: '',
      note: '',
    },
    microRecipes: [],
    annoyances: ['', '', '', '', '', '', '', '', '', ''],
    selectedAnnoyance: '',
    pearlCandidates: ['', '', '', '', ''],
    pearlRecipe: null,
  };
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function buildRecipeText(anchor, action) {
  return `在我 ${anchor} 之后，我会 ${action}。`;
}

export function buildPearlText(annoyance, action) {
  return `在我遇到${annoyance}之后，我会 ${action}。`;
}

export function getAllHabits(habitsByPeriod) {
  return ANCHOR_PERIODS.flatMap(period =>
    (habitsByPeriod[period.id] || []).map(habit => ({
      ...habit,
      periodId: period.id,
      periodLabel: period.label,
    }))
  );
}

export function getReliableAnchors(habitsByPeriod) {
  return getAllHabits(habitsByPeriod).filter(habit => habit.reliable);
}

export function canCreateMicroRecipe(draft) {
  return Boolean(draft.anchorId && draft.selectedCandidate.trim());
}

export function canCreatePearlRecipe(selectedAnnoyance, pearlCandidates) {
  return Boolean(selectedAnnoyance.trim() && pearlCandidates.some(item => item.trim()));
}

export function getPracticeRecipes(state) {
  const periodOrder = [...ANCHOR_PERIODS.map(period => period.id), 'annoyance'];
  return [...state.microRecipes, state.pearlRecipe].filter(Boolean).sort((a, b) => {
    return periodOrder.indexOf(a.periodId) - periodOrder.indexOf(b.periodId);
  });
}
