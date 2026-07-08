import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import SiteNav from '../components/SiteNav';

const ABILITY_STORAGE_KEY = 'fogg-tools-ability-chain-state-v1';
const GOLDEN_STORAGE_KEY = 'fogg-tools-golden-behavior-state-v1';
const GOLDEN_TRANSFER_KEY = 'fogg-tools-transfer-golden-behaviors-v1';
const ANCHOR_PROMPTS_STORAGE_KEY = 'fogg-tools-anchor-prompts-state-v1';

const CHAIN_LINKS = [
  { id: 'time', icon: '⏰', label: '时间', desc: '需要太多时间' },
  { id: 'money', icon: '💰', label: '资金', desc: '需要太多金钱' },
  { id: 'physical', icon: '💪', label: '体力', desc: '需要太多体力' },
  { id: 'mental', icon: '🧠', label: '脑力', desc: '需要太多脑力/注意力' },
  { id: 'schedule', icon: '📅', label: '日程', desc: '扰乱日常日程安排' },
];

const ANGLES = [
  {
    id: 'skill',
    group: '角度 1/3：提升技能',
    question: '你觉得自己有没有足够的动机去学习新技能？',
    yesFeedback: '太好了！那就去学吧。',
    noFeedback: '没关系，继续下一个角度。',
  },
  {
    id: 'tools',
    group: '角度 2/3：获取工具和资源',
    question: '你觉得自己有没有足够的动机去获取工具和资源？',
    yesFeedback: '非常好！赶紧去获取那些工具和资源吧。',
    noFeedback: '好的，再看看其他可能性。',
  },
  {
    id: 'scale',
    group: '角度 3/3：让行为变得微小（a）规模缩小化',
    question: '你能缩小行为的规模吗？',
    yesFeedback: '好极了！缩小规模后，你已经可以开始实践新习惯了。',
    noFeedback: '没关系，还有一个角度。',
  },
  {
    id: 'entry',
    group: '角度 3/3：让行为变得微小（b）入门步骤化',
    question: '你能找到你的入门步骤吗？',
    yesFeedback: '很棒！把入门步骤当作起点，然后在适当的时候逐渐增加难度。',
    noFeedback: '这是最后一个角度了。',
  },
];

const ORIGIN_X = 240;
const ORIGIN_Y = 230;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getLinkLabel(linkId) {
  return CHAIN_LINKS.find(link => link.id === linkId)?.label || '自定义';
}

function makeSchemeFromText(text, index = 0, source = '来自黄金行为探索器') {
  return {
    id: `golden_${encodeURIComponent(text).slice(0, 32)}_${index}`,
    text,
    label: index === 0 ? '黄金行为' : `黄金行为 ${index + 1}`,
    linkLabel: source,
  };
}

function mergeSchemes(current, incoming) {
  const seen = new Set();
  return [...current, ...incoming].filter(scheme => {
    const key = scheme.text.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseBehaviorTexts(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => {
    if (typeof item !== 'string') return [];
    const text = item.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.filter(entry => typeof entry === 'string').map(entry => entry.trim()).filter(Boolean);
      }
    } catch {
      // Non-JSON query values are treated as one behavior for backward compatibility.
    }
    return [text];
  });
}

function getGoldenSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GOLDEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getGoldenBehaviorsFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.behaviors)) return [];
  const placed = new Set(Array.isArray(snapshot.placed) ? snapshot.placed : []);
  const positions = snapshot.positions || {};
  return snapshot.behaviors.filter(behavior => {
    const position = positions[behavior.id];
    return position && placed.has(behavior.id) && position.x > ORIGIN_X && position.y < ORIGIN_Y;
  });
}

function getAnchorPromptSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ANCHOR_PROMPTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildAnchorPromptReportSection(anchorData) {
  if (!anchorData) {
    return '<span class="muted">本次报告未发现锚点提示设计结果。</span>';
  }
  const microRecipes = Array.isArray(anchorData.microRecipes) ? anchorData.microRecipes : [];
  const pearlRecipe = anchorData.pearlRecipe ? [anchorData.pearlRecipe] : [];
  const recipes = [...microRecipes, ...pearlRecipe];
  if (!recipes.length) {
    return '<span class="muted">锚点提示设计器已有进度，但还没有生成配方。</span>';
  }
  return `
    <div class="list">
      ${recipes.map(recipe => `
        <div class="item">
          <strong>${escapeHtml(recipe.type === 'pearl' ? '珍珠习惯' : recipe.periodLabel)}</strong>
          <p>${escapeHtml(recipe.text)}</p>
          <p class="muted">状态：${recipe.completed ? '已完成' : '未完成'}</p>
          ${recipe.note ? `<p class="muted">备注：${escapeHtml(recipe.note)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function buildReportHtml({ goldenSnapshot, habit, weakLinks, ideas, selectedSchemes, schemeAnswers }) {
  const exportedAt = new Date().toLocaleString('zh-CN');
  const anchorPromptSection = buildAnchorPromptReportSection(getAnchorPromptSnapshot());
  const goldenBehaviors = getGoldenBehaviorsFromSnapshot(goldenSnapshot);
  const allIdeas = weakLinks.flatMap(linkId => (
    (ideas[linkId] || []).map(idea => ({
      ...idea,
      linkLabel: getLinkLabel(linkId),
    }))
  ));
  const totalAnswered = selectedSchemes.reduce((count, scheme) => (
    count + Object.keys(schemeAnswers[scheme.id]?.answers || {}).length
  ), 0);
  const readySchemes = selectedSchemes.filter(scheme => {
    const answers = schemeAnswers[scheme.id]?.answers || {};
    return ANGLES.some(angle => answers[angle.id] === 'yes');
  });
  const goldenCards = goldenBehaviors.length > 0
    ? goldenBehaviors.map(behavior => `<span class="pill gold">${escapeHtml(behavior.text)}</span>`).join('')
    : '<span class="muted">本次报告未发现已完成的黄金行为结果。</span>';
  const chartItems = goldenSnapshot?.behaviors?.map(behavior => {
    const position = goldenSnapshot.positions?.[behavior.id];
    if (!position) return '';
    const isGold = goldenBehaviors.some(item => item.id === behavior.id);
    const left = Math.max(6, Math.min(94, (position.x / 480) * 100));
    const top = Math.max(8, Math.min(92, (position.y / 460) * 100));
    return `<span class="chart-point ${isGold ? 'is-gold' : ''}" style="left:${left}%;top:${top}%;">${escapeHtml(behavior.text)}</span>`;
  }).join('') || '';
  const weakLinkList = weakLinks.length > 0
    ? weakLinks.map(linkId => `<span class="pill">${escapeHtml(getLinkLabel(linkId))}</span>`).join('')
    : '<span class="muted">尚未标记薄弱环节。</span>';
  const ideaRows = allIdeas.length > 0
    ? allIdeas.map(idea => `<li><strong>${escapeHtml(idea.linkLabel)}</strong><span>${escapeHtml(idea.text)}</span></li>`).join('')
    : '<li><span class="muted">尚未记录突破想法。</span></li>';
  const schemeBlocks = selectedSchemes.length > 0
    ? selectedSchemes.map((scheme, index) => {
      const answers = schemeAnswers[scheme.id]?.answers || {};
      const notes = schemeAnswers[scheme.id]?.notes || {};
      const yesAngles = ANGLES.filter(angle => answers[angle.id] === 'yes');
      const noAngles = ANGLES.filter(angle => answers[angle.id] === 'no');
      const status = yesAngles.length > 0
        ? `可优先从 ${yesAngles.map(angle => angle.group.replace(/^角度 \d\/3：/, '')).join('、')} 入手`
        : (noAngles.length === ANGLES.length ? '暂未找到突破口，建议更换候选方案' : '评估尚未完成');
      const rows = ANGLES.map(angle => {
        const answer = answers[angle.id];
        const note = notes[angle.id];
        return `
          <tr>
            <td>${escapeHtml(angle.group)}</td>
            <td>${answer ? (answer === 'yes' ? '能' : '不能') : '未回答'}</td>
            <td>${escapeHtml(note || '无备注')}</td>
          </tr>
        `;
      }).join('');
      return `
        <article class="scheme">
          <div class="scheme-head">
            <div>
              <p class="eyebrow">方案 ${index + 1}</p>
              <h3>${escapeHtml(scheme.text)}</h3>
            </div>
            <span class="pill">${escapeHtml(scheme.linkLabel)}</span>
          </div>
          <p class="analysis">${escapeHtml(status)}</p>
          <table>
            <thead><tr><th>评估角度</th><th>选择</th><th>用户备注</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </article>
      `;
    }).join('')
    : '<p class="muted">尚未形成突破设计方案。</p>';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>福格行为设计分析报告</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f5f3fa; color: #2d2b3a; font-family: Inter, system-ui, -apple-system, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif; }
    .report { width: min(1040px, calc(100% - 36px)); margin: 0 auto; padding: 34px 0 56px; }
    .cover { background: #fff; border: 1px solid #ece4f7; border-radius: 8px; padding: 34px; box-shadow: 0 12px 34px rgba(70,55,130,.08); }
    .kicker, .eyebrow { margin: 0 0 8px; color: #6c5ce7; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 10px; color: #3b3263; font-size: clamp(30px, 5vw, 48px); line-height: 1.06; }
    h2 { margin: 0 0 18px; color: #3b3263; font-size: 24px; }
    h3 { margin: 0; color: #2d2b3a; font-size: 20px; }
    .subtitle { margin: 0; color: #5f5874; line-height: 1.8; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
    .metric { background: #faf8ff; border: 1px solid #e8e2f5; border-radius: 8px; padding: 16px; }
    .metric strong { display: block; color: #3b3263; font-size: 24px; margin-bottom: 4px; }
    .metric span { color: #756d8b; font-size: 13px; }
    section { margin-top: 22px; background: #fff; border: 1px solid #ece4f7; border-radius: 8px; padding: 26px; box-shadow: 0 8px 26px rgba(70,55,130,.06); }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 12px; background: #f0ecf8; color: #5a4b9e; font-size: 12px; font-weight: 800; }
    .pill.gold { background: #fff3cd; color: #6b4b00; border: 1px solid #ffe082; }
    .muted { color: #9b8ec4; }
    .chart { position: relative; height: 360px; margin-top: 16px; overflow: hidden; border: 1px solid #e8e2f5; border-radius: 8px; background: linear-gradient(90deg, transparent 49.8%, #c9bdf0 50%, transparent 50.2%), linear-gradient(0deg, transparent 49.8%, #c9bdf0 50%, transparent 50.2%), #faf8ff; }
    .gold-zone { position: absolute; left: 50%; top: 0; right: 0; height: 50%; background: rgba(255, 211, 79, .2); border-left: 1px dashed #ffb300; border-bottom: 1px dashed #ffb300; }
    .chart-label { position: absolute; padding: 4px 8px; border-radius: 999px; background: #fff; color: #6c5ce7; font-size: 11px; font-weight: 800; box-shadow: 0 4px 12px rgba(70,55,130,.08); }
    .chart-label.top { left: 51%; top: 10px; } .chart-label.bottom { left: 51%; bottom: 10px; } .chart-label.left { left: 10px; top: 52%; } .chart-label.right { right: 10px; top: 52%; }
    .chart-point { position: absolute; max-width: 150px; transform: translate(-50%, -50%); padding: 7px 10px; border-radius: 999px; background: #fff; border: 1px solid #e0d8f0; color: #4b3e6d; font-size: 12px; font-weight: 700; box-shadow: 0 5px 16px rgba(70,55,130,.09); }
    .chart-point.is-gold { background: #fff8da; border-color: #ffb300; color: #5c4100; }
    .two-col { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 18px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 8px 0; line-height: 1.65; }
    li strong { color: #5a4b9e; margin-right: 8px; }
    .list { display: grid; gap: 10px; }
    .item { border: 1px solid #e8e2f5; border-radius: 8px; padding: 14px; background: #fdfcff; }
    .item strong, .item p { display: block; }
    .item p { margin: 6px 0 0; line-height: 1.65; }
    .scheme { border: 1px solid #e8e2f5; border-radius: 8px; padding: 20px; margin-top: 14px; background: #fdfcff; }
    .scheme-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .analysis { margin: 0 0 14px; color: #007a5e; background: #f0fff8; border: 1px solid #b2f0d8; border-radius: 8px; padding: 10px 12px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 8px; font-size: 13px; }
    th, td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid #ece4f7; }
    th { background: #f0ecf8; color: #5a4b9e; font-size: 12px; }
    footer { margin-top: 22px; color: #9b8ec4; text-align: center; font-size: 12px; }
    @media print { body { background: #fff; } .report { width: 100%; padding: 0; } .cover, section { box-shadow: none; break-inside: avoid; } }
    @media (max-width: 760px) { .cover, section { padding: 20px; } .meta-grid, .two-col { grid-template-columns: 1fr; } .chart { height: 300px; } }
  </style>
</head>
<body>
  <main class="report">
    <header class="cover">
      <p class="kicker">Fogg Tools Report</p>
      <h1>福格行为设计分析报告</h1>
      <p class="subtitle">这份报告记录了从愿望、黄金行为，到能力链突破设计的分析过程。它适合作为复盘、咨询记录或后续行动计划的正式留档。</p>
      <div class="meta-grid">
        <div class="metric"><strong>${escapeHtml(goldenBehaviors.length)}</strong><span>黄金行为</span></div>
        <div class="metric"><strong>${escapeHtml(selectedSchemes.length)}</strong><span>评估方案</span></div>
        <div class="metric"><strong>${escapeHtml(totalAnswered)}</strong><span>已回答角度</span></div>
      </div>
    </header>
    <section>
      <h2>一、黄金行为探索结果</h2>
      <p><strong>愿望：</strong>${escapeHtml(goldenSnapshot?.wish || '未记录')}</p>
      <div class="pills">${goldenCards}</div>
      <div class="chart">
        <div class="gold-zone"></div>
        <span class="chart-label top">高影响 + 容易做</span>
        <span class="chart-label bottom">低影响</span>
        <span class="chart-label left">难做到</span>
        <span class="chart-label right">容易做到</span>
        ${chartItems}
      </div>
    </section>
    <section class="two-col">
      <div>
        <h2>二、能力链诊断</h2>
        <p><strong>困难习惯：</strong>${escapeHtml(habit || '未记录')}</p>
        <div class="pills">${weakLinkList}</div>
      </div>
      <div>
        <h2>三、突破想法</h2>
        <ul>${ideaRows}</ul>
      </div>
    </section>
    <section>
      <h2>四、方案评估与解法记录</h2>
      ${schemeBlocks}
    </section>
    <section>
      <h2>五、锚点提示设计</h2>
      <p>这一部分记录用户如何把微行为接到可靠锚点之后，并把配方排回一天的实践时间轴。</p>
      ${anchorPromptSection}
    </section>
    <section>
      <h2>六、建议结论</h2>
      <p>${readySchemes.length > 0
        ? `建议优先推进：${escapeHtml(readySchemes.map(scheme => scheme.text).join('、'))}。这些方案至少在一个能力角度上找到了可执行突破口。`
        : '当前记录里还没有明确可推进的方案。建议回到候选方案列表，或者重新寻找一个更容易开始的黄金行为。'}</p>
    </section>
    <footer>导出时间：${escapeHtml(exportedAt)} · 由福格行为设计工具箱生成</footer>
  </main>
</body>
</html>`;
}

export default function AbilityChainPage() {
  const router = useRouter();
  const [habitInput, setHabitInput] = useState('');
  const [habit, setHabit] = useState('');
  const [chainStep, setChainStep] = useState(1);
  const [weakLinks, setWeakLinks] = useState([]);
  const [ideas, setIdeas] = useState({});
  const [ideaInputs, setIdeaInputs] = useState({});
  const [selectedIdeaIds, setSelectedIdeaIds] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [module2Expanded, setModule2Expanded] = useState(false);
  const [customVisible, setCustomVisible] = useState(false);
  const [customBehavior, setCustomBehavior] = useState('');
  const [activeSchemeIndex, setActiveSchemeIndex] = useState(0);
  const [schemeAnswers, setSchemeAnswers] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const hydratedRef = useRef(false);
  const schemeTabsRef = useRef(null);
  const reportUrlRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(ABILITY_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setHabitInput(saved.habitInput || '');
        setHabit(saved.habit || '');
        setChainStep(saved.chainStep || 1);
        setWeakLinks(Array.isArray(saved.weakLinks) ? saved.weakLinks : []);
        setIdeas(saved.ideas || {});
        setIdeaInputs(saved.ideaInputs || {});
        setSelectedIdeaIds(Array.isArray(saved.selectedIdeaIds) ? saved.selectedIdeaIds : []);
        setSelectedSchemes(Array.isArray(saved.selectedSchemes) ? saved.selectedSchemes : []);
        setModule2Expanded(!!saved.module2Expanded);
        setActiveSchemeIndex(saved.activeSchemeIndex || 0);
        setSchemeAnswers(saved.schemeAnswers || {});
        setOpenNotes(saved.openNotes || {});
      }
    } catch {
      window.localStorage.removeItem(ABILITY_STORAGE_KEY);
    } finally {
      hydratedRef.current = true;
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated) return;
    const payload = {
      habitInput,
      habit,
      chainStep,
      weakLinks,
      ideas,
      ideaInputs,
      selectedIdeaIds,
      selectedSchemes,
      module2Expanded,
      activeSchemeIndex,
      schemeAnswers,
      openNotes,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(ABILITY_STORAGE_KEY, JSON.stringify(payload));
  }, [hasHydrated, habitInput, habit, chainStep, weakLinks, ideas, ideaInputs, selectedIdeaIds, selectedSchemes, module2Expanded, activeSchemeIndex, schemeAnswers, openNotes]);

  useEffect(() => () => {
    if (reportUrlRef.current) URL.revokeObjectURL(reportUrlRef.current);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!router.isReady) return;
    const incoming = [];
    const behavior = typeof router.query.behavior === 'string' ? router.query.behavior.trim() : '';
    if (behavior) incoming.push(makeSchemeFromText(behavior));
    parseBehaviorTexts(router.query.behaviors).forEach((text, index) => {
      incoming.push(makeSchemeFromText(text, index));
    });

    if (typeof window !== 'undefined' && router.query.from === 'golden') {
      try {
        const raw = window.localStorage.getItem(GOLDEN_TRANSFER_KEY);
        const transfer = raw ? JSON.parse(raw) : null;
        if (Array.isArray(transfer?.behaviors)) {
          transfer.behaviors.forEach((item, index) => {
            if (item?.text) incoming.push(makeSchemeFromText(item.text, index));
          });
        }
        window.localStorage.removeItem(GOLDEN_TRANSFER_KEY);
      } catch {
        window.localStorage.removeItem(GOLDEN_TRANSFER_KEY);
      }
    }

    if (incoming.length === 0) return;
    setSelectedSchemes(prev => mergeSchemes(prev, incoming));
    setActiveSchemeIndex(0);
    setModule2Expanded(true);
  }, [router.isReady, router.query.behavior, router.query.behaviors, router.query.from]);

  const allIdeas = useMemo(() => {
    return weakLinks.flatMap(linkId => {
      const link = CHAIN_LINKS.find(item => item.id === linkId);
      return (ideas[linkId] || []).map(idea => ({
        ...idea,
        linkId,
        linkLabel: link?.label || '',
      }));
    });
  }, [ideas, weakLinks]);

  const currentScheme = selectedSchemes[activeSchemeIndex];
  const selectedIdeas = allIdeas.filter(idea => selectedIdeaIds.includes(idea.id));

  const confirmHabit = () => {
    const nextHabit = habitInput.trim() || '每天多吃蔬菜';
    setHabit(nextHabit);
    setHabitInput(nextHabit);
    setChainStep(Math.max(chainStep, 2));
  };

  const fullResetModule1 = () => {
    setHabit('');
    setHabitInput('');
    setChainStep(1);
    setWeakLinks([]);
    setIdeas({});
    setIdeaInputs({});
    setSelectedIdeaIds([]);
    setCustomVisible(false);
    setCustomBehavior('');
  };

  const toggleWeakLink = (id) => {
    setWeakLinks(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
  };

  const goToIdeas = () => {
    if (weakLinks.length === 0) return;
    setChainStep(Math.max(chainStep, 3));
  };

  const setIdeaInput = (linkId, value) => {
    setIdeaInputs(prev => ({ ...prev, [linkId]: value }));
  };

  const addIdea = (linkId) => {
    const text = (ideaInputs[linkId] || '').trim();
    if (!text) return;
    setIdeas(prev => ({
      ...prev,
      [linkId]: [...(prev[linkId] || []), { id: makeId('idea'), text }],
    }));
    setIdeaInputs(prev => ({ ...prev, [linkId]: '' }));
  };

  const removeIdea = (linkId, ideaId) => {
    setIdeas(prev => ({
      ...prev,
      [linkId]: (prev[linkId] || []).filter(idea => idea.id !== ideaId),
    }));
    setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));
  };

  const goToSelect = () => {
    if (allIdeas.length === 0) return;
    setChainStep(Math.max(chainStep, 4));
  };

  const toggleSelectIdea = (ideaId) => {
    setSelectedIdeaIds(prev => {
      if (prev.includes(ideaId)) return prev.filter(id => id !== ideaId);
      if (prev.length >= 3) return [...prev.slice(1), ideaId];
      return [...prev, ideaId];
    });
  };

  const confirmSelection = () => {
    if (selectedIdeas.length === 0) return;
    const moduleSchemes = selectedIdeas.map((idea, index) => ({
      id: idea.id,
      text: idea.text,
      label: `方案 ${index + 1}`,
      linkLabel: idea.linkLabel,
    }));
    setSelectedSchemes(prev => mergeSchemes(prev, moduleSchemes));
    setActiveSchemeIndex(0);
    setModule2Expanded(true);
  };

  const saveCustomBehavior = () => {
    const text = customBehavior.trim();
    if (!text) return;
    setSelectedSchemes(prev => mergeSchemes(prev, [{
      id: makeId('custom'),
      text,
      label: '自定义方案',
      linkLabel: '自定义',
    }]));
    setActiveSchemeIndex(0);
    setModule2Expanded(true);
    setCustomVisible(false);
  };

  const setSchemeAnswer = (schemeId, angleId, answer) => {
    setSchemeAnswers(prev => ({
      ...prev,
      [schemeId]: {
        answers: { ...(prev[schemeId]?.answers || {}), [angleId]: answer },
        notes: { ...(prev[schemeId]?.notes || {}) },
      },
    }));
  };

  const resetAngle = (schemeId, angleId) => {
    setSchemeAnswers(prev => {
      const next = { ...prev };
      const current = next[schemeId];
      if (!current) return next;
      next[schemeId] = {
        answers: { ...current.answers },
        notes: { ...current.notes },
      };
      delete next[schemeId].answers[angleId];
      delete next[schemeId].notes[angleId];
      return next;
    });
  };

  const updateNote = (schemeId, angleId, value) => {
    setSchemeAnswers(prev => ({
      ...prev,
      [schemeId]: {
        answers: { ...(prev[schemeId]?.answers || {}) },
        notes: { ...(prev[schemeId]?.notes || {}), [angleId]: value },
      },
    }));
  };

  const focusSchemeTabs = () => {
    schemeTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    schemeTabsRef.current?.focus({ preventScroll: true });
  };

  const removeCurrentScheme = () => {
    if (!currentScheme) return;
    setSelectedSchemes(prev => {
      const next = prev.filter(scheme => scheme.id !== currentScheme.id);
      setActiveSchemeIndex(index => Math.min(index, Math.max(next.length - 1, 0)));
      return next;
    });
    setSchemeAnswers(prev => {
      const next = { ...prev };
      delete next[currentScheme.id];
      return next;
    });
  };

  const exportHtmlReport = () => {
    if (!habit && selectedSchemes.length === 0) {
      setReportMessage('先填写一个困难习惯，或至少保留一个突破方案，再生成报告。');
      return;
    }
    const html = buildReportHtml({
      goldenSnapshot: getGoldenSnapshot(),
      habit,
      weakLinks,
      ideas,
      selectedSchemes,
      schemeAnswers,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    if (reportUrlRef.current) URL.revokeObjectURL(reportUrlRef.current);
    const url = URL.createObjectURL(blob);
    reportUrlRef.current = url;

    const preview = window.open(url, '_blank', 'noopener,noreferrer');
    const link = document.createElement('a');
    link.href = url;
    link.download = `fogg-tools-report-${new Date().toISOString().slice(0, 10)}.html`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setReportMessage(preview
      ? '报告已在新标签页打开，并已尝试下载 HTML 文件。'
      : '报告已生成并尝试下载；如果浏览器拦截了新标签页，请允许弹窗后再试一次。'
    );
  };

  const currentAnswers = currentScheme ? (schemeAnswers[currentScheme.id]?.answers || {}) : {};
  const currentNotes = currentScheme ? (schemeAnswers[currentScheme.id]?.notes || {}) : {};
  const allAnswered = currentScheme && ANGLES.every(angle => currentAnswers[angle.id]);
  const allNo = allAnswered && ANGLES.every(angle => currentAnswers[angle.id] === 'no');

  return (
    <>
      <SiteNav />
      <main className="container">
      <header className="header">
        <div className="header-icon">🔗</div>
        <h1>福格能力链 · 突破设计工具</h1>
        <p className="subtitle">分析薄弱环节，设计让行为更容易的方法</p>
        <div className="header-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={exportHtmlReport}
            disabled={!habit && selectedSchemes.length === 0}
          >
            生成分析报告
          </button>
        </div>
        {reportMessage && <p className="report-message">{reportMessage}</p>}
      </header>

      <section>
        <div className="section-title"><span className="num">1</span> 能力链：分析困难习惯</div>
        <div className="step-progress" aria-label="能力链步骤">
          {[1, 2, 3, 4].map(step => (
            <span key={step} className={`step-pill ${chainStep === step ? 'active' : ''} ${chainStep > step ? 'done' : ''}`}>
              {step === 1 && '① 写下习惯'}
              {step === 2 && '② 标记薄弱环节'}
              {step === 3 && '③ 提出突破想法'}
              {step === 4 && '④ 选出3个最可行'}
            </span>
          ))}
        </div>

        <div className="card">
          <p className="prompt-title">📝 写下一个过去尝试养成却没能坚持下来的困难习惯</p>
          <p className="hint">如果一时想不出，就用“每天多吃蔬菜”</p>
          <div className="input-group">
            <input
              value={habitInput}
              onChange={event => setHabitInput(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && confirmHabit()}
              placeholder="例如“每天多吃蔬菜”"
            />
            <button className="btn btn-primary" onClick={confirmHabit}>确认习惯</button>
          </div>
          {habit && (
            <div className="confirmed">
              <span>🎯 分析中的习惯：</span>
              <strong>{habit}</strong>
              <button className="btn-danger-text" onClick={fullResetModule1}>更换</button>
            </div>
          )}
        </div>

        {chainStep >= 2 && (
          <div className="card">
            <p className="prompt-title">🔍 探索型问题：是什么让这个行为难以做到？</p>
            <p className="hint">点击链环标记薄弱环节（可多选），再次点击取消</p>
            <div className="chain-wrapper">
              {CHAIN_LINKS.map((link, index) => {
                const isWeak = weakLinks.includes(link.id);
                const connectorWeak = index > 0 && (isWeak || weakLinks.includes(CHAIN_LINKS[index - 1].id));
                return (
                  <div className="chain-piece" key={link.id}>
                    {index > 0 && <div className={`chain-connector ${connectorWeak ? 'weak-connector' : ''}`} />}
                    <button
                      type="button"
                      className={`chain-node ${isWeak ? 'weak-node' : ''}`}
                      onClick={() => toggleWeakLink(link.id)}
                      title={link.desc}
                    >
                      <span className={`link-ring ${isWeak ? 'weak' : ''}`}>
                        <span>{link.icon}</span>
                        <span className="inner-dot" />
                      </span>
                      <span className="link-label">{link.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="weak-summary">
              {weakLinks.map(linkId => <span key={linkId} className="tag tag-weak">{getLinkLabel(linkId)}</span>)}
            </div>
            <div className="center-line">
              <span>{weakLinks.length > 0 ? `已选择 ${weakLinks.length} 个薄弱环节` : '请选择至少一个薄弱环节'}</span>
            </div>
            <div className="center-line">
              <button className="btn btn-primary" onClick={goToIdeas} disabled={weakLinks.length === 0}>确认薄弱环节，提出突破想法</button>
            </div>
          </div>
        )}

        {chainStep >= 3 && (
          <div className="card">
            <p className="prompt-title">💡 突破型问题：怎样才能让它变得更容易执行？</p>
            <p className="hint">针对每个薄弱环节，提出多个突破想法</p>
            {weakLinks.map(linkId => (
              <div key={linkId} className="idea-input-area">
                <span className="tag tag-weak">{CHAIN_LINKS.find(link => link.id === linkId)?.icon} {getLinkLabel(linkId)}</span>
                <div className="input-group compact">
                  <input
                    value={ideaInputs[linkId] || ''}
                    onChange={event => setIdeaInput(linkId, event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && addIdea(linkId)}
                    placeholder="输入一个突破想法..."
                  />
                  <button className="btn btn-outline btn-sm" onClick={() => addIdea(linkId)}>+ 添加</button>
                </div>
                <div className="idea-list">
                  {(ideas[linkId] || []).map(idea => (
                    <div className="idea-row" key={idea.id}>
                      <span>{idea.text}</span>
                      <button className="btn-danger-text" onClick={() => removeIdea(linkId, idea.id)}>删除</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {allIdeas.length > 0 && (
              <div className="all-ideas">
                已收集 {allIdeas.length} 个突破想法
              </div>
            )}
            <div className="center-line">
              <button className="btn btn-primary" onClick={goToSelect} disabled={allIdeas.length === 0}>想法够了，进入挑选</button>
            </div>
          </div>
        )}

        {chainStep >= 4 && (
          <div className="card">
            <p className="prompt-title">✅ 从所有想法中挑选出最多 3 个最可行的方案</p>
            <p className="hint">点击想法卡片进行勾选，超过 3 个时会自动移除最早选择的一个</p>
            <div>
              {allIdeas.map(idea => {
                const selected = selectedIdeaIds.includes(idea.id);
                return (
                  <button
                    type="button"
                    key={idea.id}
                    className={`idea-item ${selected ? 'selected' : ''}`}
                    onClick={() => toggleSelectIdea(idea.id)}
                  >
                    <span className="idea-check">✓</span>
                    <span className="idea-text">{idea.text}</span>
                    <span className="idea-category">{idea.linkLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="selected-count">已选 {selectedIdeaIds.length} / 3</div>
            <div className="center-line">
              <button className="btn btn-gold" onClick={confirmSelection} disabled={selectedIdeaIds.length === 0}>确认这些方案 ✓</button>
            </div>
            {selectedSchemes.length > 0 && (
              <div className="alert alert-success">
                <strong>已确认 {selectedSchemes.length} 个最可行的方案：</strong>
                {selectedSchemes.map((scheme, index) => (
                  <div key={scheme.id} className="result-line">
                    <strong>{index + 1}.</strong> {scheme.text} <span className="tag tag-weak">{scheme.linkLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="divider-label">模块二</div>
      <button
        type="button"
        className={`card collapsible-card ${module2Expanded ? 'expanded' : ''}`}
        onClick={() => setModule2Expanded(prev => !prev)}
      >
        <span className="section-title inline-title"><span className="num">2</span> 突破型问题：让行为容易做的设计流程</span>
        <span className="toggle-icon">▼</span>
      </button>

      {module2Expanded && (
        <section>
          {selectedSchemes.length === 0 ? (
            <div className="alert alert-info">
              <strong>请先完成模块一，获取最可行的方案。</strong>
              <br />
              如果你已经有黄金行为了，可以跳过模块一，直接填写一个自定义行为。
              <div className="custom-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setCustomVisible(true)}>跳过模块一，自定义黄金行为</button>
              </div>
              {customVisible && (
                <div className="input-group custom-input">
                  <input
                    value={customBehavior}
                    onChange={event => setCustomBehavior(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && saveCustomBehavior()}
                    placeholder="输入一个黄金行为..."
                  />
                  <button className="btn btn-primary btn-sm" onClick={saveCustomBehavior}>确认</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="tab-bar" ref={schemeTabsRef} tabIndex="-1">
                {selectedSchemes.map((scheme, index) => (
                  <button
                    key={scheme.id}
                    className={`tab-btn ${index === activeSchemeIndex ? 'active' : ''}`}
                    onClick={() => setActiveSchemeIndex(index)}
                  >
                    {scheme.label}
                  </button>
                ))}
              </div>

              {currentScheme && (
                <div className="scheme-info">
                  <strong>📌 当前方案：</strong>
                  <span>{currentScheme.text}</span>
                  <span className="tag tag-weak">{currentScheme.linkLabel}</span>
                  <button className="btn-danger-text scheme-remove" onClick={removeCurrentScheme}>移除这个方案</button>
                </div>
              )}

              {currentScheme && ANGLES.map(angle => {
                const answer = currentAnswers[angle.id];
                const noteKey = `${currentScheme.id}-${angle.id}`;
                const noteOpen = !!openNotes[noteKey];
                return (
                  <div key={angle.id} className={`question-card ${answer === 'yes' ? 'answered-yes' : ''} ${answer === 'no' ? 'answered-no' : ''}`}>
                    <span className="q-num">{angle.group}</span>
                    <div className="q-text">{angle.question}</div>
                    <div className="q-actions">
                      {!answer ? (
                        <>
                          <button className="btn-choice btn-yes" onClick={() => setSchemeAnswer(currentScheme.id, angle.id, 'yes')}>👍 能</button>
                          <button className="btn-choice btn-no" onClick={() => setSchemeAnswer(currentScheme.id, angle.id, 'no')}>👎 不能</button>
                        </>
                      ) : (
                        <>
                          <span className={answer === 'yes' ? 'answer-yes' : 'answer-no'}>{answer === 'yes' ? '✔ 能' : '✘ 不能'}</span>
                          <button className="btn btn-outline btn-sm" onClick={() => resetAngle(currentScheme.id, angle.id)}>修改</button>
                        </>
                      )}
                      <button className="btn-toggle-note" onClick={() => setOpenNotes(prev => ({ ...prev, [noteKey]: !prev[noteKey] }))}>+</button>
                    </div>
                    {answer && (
                      <div className={`q-feedback ${answer === 'yes' ? 'yes-fb' : 'no-fb'}`}>
                        {answer === 'yes' ? angle.yesFeedback : angle.noFeedback}
                      </div>
                    )}
                    {noteOpen && (
                      <div className="note-area">
                        <textarea
                          value={currentNotes[angle.id] || ''}
                          onChange={event => updateNote(currentScheme.id, angle.id, event.target.value)}
                          placeholder="在此记录备注..."
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {allNo && (
                <div className="alert alert-warning">
                  <strong>当前方案的所有角度都没有找到突破口</strong>
                  <br />
                  这个方案暂时没有找到突破口。可以先看看其它候选方案，或者回到黄金行为探索器找一个更容易开始的行为。
                  <div className="custom-actions">
                    <button className="btn btn-outline btn-sm" onClick={focusSchemeTabs}>看看其他候选方案</button>
                    <Link className="btn btn-gold btn-sm" href="/golden-behavior">寻找新的黄金行为</Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <style jsx>{`
        .container {
          max-width: 960px;
          min-height: calc(100vh - 96px);
          margin: 0 auto;
          padding: 0 20px 48px;
          --card-bg: rgba(255, 255, 255, 0.86);
          --text: var(--ft-ink);
          --text-secondary: var(--ft-plum);
          --text-muted: var(--ft-muted);
          --purple: var(--ft-plum);
          --purple-light: #8c82b5;
          --purple-bg: var(--ft-plum-soft);
          --gold: var(--ft-amber);
          --gold-light: #fff3cd;
          --danger: var(--ft-danger);
          --success: var(--ft-success);
          --radius-sm: 14px;
          --radius-md: 16px;
          --radius-lg: 18px;
          --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--ft-line);
          border-radius: 8px;
          padding: 24px 20px;
          box-shadow: 0 12px 34px rgba(65, 56, 105, 0.08);
        }

        .header-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }

        .header h1 {
          margin: 0 0 4px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ft-plum);
          text-wrap: balance;
        }

        .subtitle {
          margin: 0;
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }

        .report-message {
          width: fit-content;
          max-width: min(520px, 100%);
          margin: 10px auto 0;
          color: var(--ft-success);
          background: #effcf8;
          border: 1px solid #bfeee1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin: 36px 0 18px;
        }

        .inline-title {
          margin: 0;
        }

        .section-title .num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--purple);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .card {
          width: 100%;
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 24px 28px;
          box-shadow: 0 10px 30px rgba(65, 56, 105, 0.07);
          border: 1px solid var(--ft-line);
          margin-bottom: 18px;
          transition: var(--transition);
        }

        .card:hover {
          box-shadow: 0 16px 38px rgba(65, 56, 105, 0.1);
        }

        .prompt-title {
          margin: 0 0 8px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .hint {
          margin: 0 0 14px;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .input-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .input-group.compact {
          margin-top: 10px;
        }

        .input-group input {
          flex: 1;
          min-width: 200px;
          border: 2px solid var(--ft-line);
          border-radius: 40px;
          padding: 13px 20px;
          font-size: 0.95rem;
          outline: none;
          font-family: inherit;
          background: #fbf8f3;
          transition: var(--transition);
        }

        .input-group input:focus {
          border-color: var(--purple-light);
          box-shadow: 0 0 0 4px rgba(79, 71, 120, 0.08);
          background: #fff;
        }

        .btn,
        :global(a.btn) {
          border: none;
          border-radius: 30px;
          padding: 12px 26px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          transition: var(--transition);
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary,
        :global(a.btn-primary) {
          background: var(--purple);
          color: #fff;
          box-shadow: 0 8px 20px rgba(65, 56, 105, 0.24);
        }

        .btn-outline,
        :global(a.btn-outline) {
          background: #fff;
          color: var(--purple);
          border: 2px solid var(--ft-line);
        }

        .btn-gold,
        :global(a.btn-gold) {
          background: #f2c14d;
          color: #4a3500;
          box-shadow: 0 8px 20px rgba(217, 155, 30, 0.24);
        }

        .btn-sm,
        :global(a.btn-sm) {
          padding: 7px 16px;
          font-size: 0.8rem;
        }

        .btn-danger-text {
          background: none;
          border: none;
          color: var(--danger);
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 500;
          padding: 2px 6px;
          font-family: inherit;
        }

        .scheme-remove {
          margin-left: auto;
        }

        .confirmed {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
          color: var(--text-secondary);
        }

        .step-progress {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .step-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          background: #e0d8f0;
          color: #9b8ec4;
          transition: var(--transition);
        }

        .step-pill.active {
          background: var(--purple);
          color: #fff;
          box-shadow: 0 3px 12px rgba(108, 92, 231, 0.3);
        }

        .step-pill.done {
          background: var(--success);
          color: #fff;
        }

        .chain-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0;
          padding: 20px 10px;
        }

        .chain-piece {
          display: flex;
          align-items: center;
        }

        .chain-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
          font-family: inherit;
        }

        .link-ring {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 7px solid #d0c8f0;
          background: #faf9fd;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.35s;
          font-size: 1.2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .link-ring.weak {
          border-color: var(--danger);
          background: #fff5f5;
          box-shadow: 0 0 20px rgba(225, 112, 85, 0.25);
        }

        .inner-dot {
          position: absolute;
          right: 8px;
          bottom: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #d0c8f0;
        }

        .link-ring.weak .inner-dot {
          background: var(--danger);
          width: 14px;
          height: 14px;
        }

        .link-label {
          margin-top: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .weak-node .link-label {
          color: #c0392b;
        }

        .chain-connector {
          width: 36px;
          height: 4px;
          background: #e0d8f0;
          border-radius: 2px;
          flex-shrink: 0;
          margin: 0 -2px;
          transform: translateY(-12px);
        }

        .weak-connector {
          background: #fab1a0;
        }

        .weak-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .tag {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .tag-weak {
          background: #fff5f5;
          color: var(--danger);
        }

        .center-line {
          text-align: center;
          margin-top: 12px;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .idea-input-area {
          padding: 14px 0;
          border-bottom: 1px solid #ece4f7;
        }

        .idea-input-area:last-of-type {
          border-bottom: none;
        }

        .idea-list {
          margin-top: 10px;
          display: grid;
          gap: 6px;
        }

        .idea-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          background: #faf9fd;
          border: 1px solid #ece4f7;
          border-radius: var(--radius-sm);
          font-size: 0.86rem;
        }

        .all-ideas {
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-top: 12px;
        }

        .idea-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #faf9fd;
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
          border: 1px solid #ece4f7;
          cursor: pointer;
          transition: var(--transition);
          user-select: none;
          font-family: inherit;
          text-align: left;
        }

        .idea-item.selected {
          border-color: var(--gold);
          background: var(--gold-light);
          box-shadow: 0 0 12px rgba(255, 179, 0, 0.15);
        }

        .idea-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #d0c8f0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: transparent;
        }

        .idea-item.selected .idea-check {
          border-color: var(--gold);
          background: var(--gold);
          color: #fff;
        }

        .idea-text {
          font-size: 0.88rem;
          color: var(--text);
          flex: 1;
        }

        .idea-category {
          font-size: 0.68rem;
          color: var(--text-muted);
          background: #f0ecf8;
          padding: 2px 8px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .selected-count {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-align: center;
          margin-top: 8px;
          font-weight: 500;
        }

        .result-line {
          margin-top: 10px;
        }

        .divider-label {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 30px 0 20px;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .divider-label::before,
        .divider-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0d8f0;
        }

        .collapsible-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }

        .toggle-icon {
          transition: transform 0.3s;
          font-size: 1.2rem;
        }

        .expanded .toggle-icon {
          transform: rotate(180deg);
        }

        .alert {
          padding: 16px 20px;
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.9rem;
          margin-top: 14px;
          line-height: 1.6;
        }

        .alert-warning {
          background: #fffdf5;
          border: 2px solid #ffe082;
          color: #5d4037;
        }

        .alert-success {
          background: #f0fff8;
          border: 2px solid #b2f0d8;
          color: #007a5e;
        }

        .alert-info {
          background: #f8f6ff;
          border: 2px solid #d0c8f0;
          color: var(--text-secondary);
        }

        .custom-actions {
          margin-top: 14px;
        }

        .custom-input {
          margin-top: 14px;
        }

        .tab-bar {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          border-bottom: 2px solid #e0d8f0;
          padding-bottom: 8px;
        }

        .tab-btn {
          padding: 8px 18px;
          border-radius: 20px 20px 0 0;
          background: #f0ecf8;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.82rem;
          border: none;
          cursor: pointer;
          transition: var(--transition);
          font-family: inherit;
        }

        .tab-btn.active {
          background: var(--purple);
          color: #fff;
          box-shadow: 0 3px 10px rgba(108, 92, 231, 0.25);
        }

        .scheme-info {
          background: #faf9fd;
          border: 1px solid #ece4f7;
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 0.88rem;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .scheme-info strong {
          color: var(--text-secondary);
        }

        .question-card {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 22px 26px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 2px solid #ece4f7;
          margin-bottom: 14px;
          transition: var(--transition);
        }

        .question-card.answered-yes {
          border-color: var(--success);
          background: #fafffe;
        }

        .question-card.answered-no {
          border-color: #e0d8f0;
          opacity: 0.88;
        }

        .q-num {
          display: inline-block;
          background: var(--purple-bg);
          color: var(--purple);
          font-weight: 700;
          font-size: 0.75rem;
          padding: 3px 10px;
          border-radius: 14px;
          margin-bottom: 8px;
        }

        .q-text {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .q-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .btn-choice {
          background: #fff;
          color: #636e72;
          border: 2px solid #dfe6e9;
          border-radius: 24px;
          padding: 9px 22px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
        }

        .btn-choice.btn-yes:hover {
          background: var(--success);
          border-color: var(--success);
          color: #fff;
        }

        .btn-toggle-note {
          background: none;
          border: 1px solid #d0c8f0;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--purple);
          font-size: 1.1rem;
          font-weight: 700;
          font-family: inherit;
        }

        .answer-yes {
          color: var(--success);
          font-weight: 700;
        }

        .answer-no {
          color: #636e72;
          font-weight: 700;
        }

        .q-feedback {
          margin-top: 10px;
          font-size: 0.82rem;
          padding: 8px 14px;
          border-radius: 12px;
        }

        .yes-fb {
          background: #f0fff8;
          color: #00a381;
          border: 1px solid #b2f0d8;
        }

        .no-fb {
          background: #faf9fd;
          color: #636e72;
          border: 1px solid #e0d8f0;
        }

        .note-area {
          margin-top: 10px;
        }

        .note-area textarea {
          width: 100%;
          min-height: 86px;
          border: 2px solid #e0d8f0;
          border-radius: 16px;
          padding: 12px;
          font-size: 0.85rem;
          outline: none;
          font-family: inherit;
          resize: vertical;
          background: #faf9fd;
        }

        @media (max-width: 640px) {
          .container {
            padding: 16px 12px 36px;
          }

          .top-nav {
            flex-direction: column;
            align-items: flex-start;
          }

          .header h1 {
            font-size: 1.2rem;
          }

          .card {
            padding: 16px 18px;
            border-radius: var(--radius-md);
          }

          .link-ring {
            width: 42px;
            height: 42px;
            border-width: 5px;
          }

          .chain-connector {
            width: 16px;
            height: 3px;
            transform: translateY(-8px);
          }

          .link-label {
            font-size: 0.65rem;
          }

          .btn {
            padding: 10px 18px;
            font-size: 0.82rem;
          }

          .input-group input {
            min-width: 160px;
            padding: 10px 16px;
            font-size: 0.85rem;
          }

          .question-card {
            padding: 16px 18px;
          }

          .q-text {
            font-size: 0.85rem;
          }

          .idea-category {
            white-space: nowrap;
          }
        }
      `}</style>
      </main>
    </>
  );
}
