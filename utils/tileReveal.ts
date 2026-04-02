import type { ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { CardSymbol, Effect, TileDef, TileTrigger } from '../types';

type TileHintTone = 'buff' | 'debuff' | 'trigger' | 'item';
type TileHintKind = 'reveal' | 'trigger' | 'effect';
type IconComponent = ComponentType<{ size?: number; className?: string }>;
type RevealSymbol = Exclude<CardSymbol, 'NONE'>;

export interface TileRevealPresentation {
  label: string;
  shortLabel: string;
  description: string;
  pendingDescription: string;
  summaryText: string;
  icon: IconComponent;
  accentClassName: string;
  panelClassName: string;
  badgeClassName: string;
  type: TileHintTone;
}

export interface TileHintEntry {
  key: string;
  kind: TileHintKind;
  label: string;
  text: string;
  summaryText: string;
  icon: IconComponent;
  colorClassName: string;
  containerClassName: string;
  bodyClassName: string;
  type: TileHintTone;
  repeatable?: boolean;
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  might: '力量',
  speed: '速度',
  sanity: '理智',
  knowledge: '知识',
};

const CARD_SYMBOL_PRESENTATIONS: Record<RevealSymbol, TileRevealPresentation> = {
  EVENT: {
    label: '事件牌',
    shortLabel: '事件',
    description: '首次揭示并进入此房间后，立即触发一张事件牌。',
    pendingDescription: '放置并首次进入该房间后，会立即触发一张事件牌。',
    summaryText: '首次揭示触发事件牌',
    icon: Sparkles,
    accentClassName: 'text-amber-400',
    panelClassName: 'bg-amber-900/20 border-amber-800/30',
    badgeClassName: 'bg-amber-950/90 border border-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.18)]',
    type: 'trigger',
  },
  ITEM: {
    label: '物品牌',
    shortLabel: '物品',
    description: '首次揭示并进入此房间后，立即获得一张物品牌。',
    pendingDescription: '放置并首次进入该房间后，会立即获得一张物品牌。',
    summaryText: '首次揭示获得物品牌',
    icon: Package,
    accentClassName: 'text-indigo-400',
    panelClassName: 'bg-indigo-900/20 border-indigo-800/30',
    badgeClassName: 'bg-indigo-950/90 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]',
    type: 'item',
  },
  OMEN: {
    label: '预兆牌',
    shortLabel: '预兆',
    description: '首次揭示并进入此房间后，立即翻开一张预兆牌，并照常处理作祟检定。',
    pendingDescription: '放置并首次进入该房间后，会翻开一张预兆牌，并照常处理作祟检定。',
    summaryText: '首次揭示翻开预兆牌',
    icon: AlertTriangle,
    accentClassName: 'text-emerald-400',
    panelClassName: 'bg-emerald-900/20 border-emerald-800/30',
    badgeClassName: 'bg-emerald-950/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.18)]',
    type: 'trigger',
  },
};

const TRIGGER_STYLES = {
  enter: {
    label: '进入时触发',
    icon: ArrowRight,
    colorClassName: 'text-cyan-400',
    containerClassName: 'bg-cyan-900/20 border-cyan-800/30',
    bodyClassName: 'text-cyan-300/80',
    type: 'trigger' as TileHintTone,
    repeatable: true,
  },
  leave: {
    label: '离开时触发',
    icon: ArrowLeft,
    colorClassName: 'text-amber-400',
    containerClassName: 'bg-amber-900/20 border-amber-800/30',
    bodyClassName: 'text-amber-300/80',
    type: 'trigger' as TileHintTone,
    repeatable: false,
  },
  legacyEnter: {
    label: '进入时效果',
    icon: ArrowRight,
    colorClassName: 'text-purple-400',
    containerClassName: 'bg-purple-900/20 border-purple-800/30',
    bodyClassName: 'text-purple-300/80',
    type: 'trigger' as TileHintTone,
    repeatable: true,
  },
  staticEffect: {
    label: '房间效果',
    icon: Zap,
    colorClassName: 'text-zinc-300',
    containerClassName: 'bg-zinc-900/50 border-zinc-800/50',
    bodyClassName: 'text-zinc-300/80',
    type: 'trigger' as TileHintTone,
    repeatable: false,
  },
};

const getAttributeLabel = (attribute?: string): string => {
  if (!attribute) {
    return '属性';
  }
  return ATTRIBUTE_LABELS[attribute] || attribute;
};

const summarize = (prefix: string, text: string): string => {
  const normalized = text.replace(/[。；]+$/u, '');
  return `${prefix}：${normalized}`;
};

export const getTileRevealPresentation = (cardSymbol?: CardSymbol | string | null): TileRevealPresentation | null => {
  if (!cardSymbol || cardSymbol === 'NONE') {
    return null;
  }

  return CARD_SYMBOL_PRESENTATIONS[cardSymbol as RevealSymbol] || null;
};

export const renderTileEffectText = (effect: Partial<Effect> & { text?: string }): string => {
  if (effect.text) {
    return effect.text;
  }

  switch (effect.type) {
    case 'MODIFY_STAT': {
      const attrName = getAttributeLabel(effect.stat || effect.attribute);
      const amount = effect.amount || 0;
      return `${attrName} ${amount > 0 ? '+' : ''}${amount}`;
    }
    case 'DAMAGE':
      return `受到 ${effect.amount || 0} 点伤害`;
    case 'HEAL':
      return `恢复 ${effect.amount || 0} 点生命`;
    case 'DRAW_CARD': {
      const count = effect.amount || 1;
      const reveal = getTileRevealPresentation(effect.deck);
      const label = reveal ? reveal.label : '卡牌';
      return `抽取 ${count} 张${label}`;
    }
    case 'LOG':
      return effect.message || '记录一条日志';
    case 'MOVE_PLAYER':
      return `移动到 ${effect.location || '指定位置'}`;
    case 'GIVE_ITEM':
      return effect.itemId ? `获得物品 ${effect.itemId}` : '获得一件物品';
    case 'GIVE_SKILL':
      return effect.skillId ? `获得技能 ${effect.skillId}` : '获得一项技能';
    case 'ROLL':
      return `进行 ${getAttributeLabel(effect.attribute)} 检定`;
    default:
      return effect.type || '未知效果';
  }
};

export const getTileTriggerText = (trigger: TileTrigger): string => {
  if (trigger.message) {
    return trigger.message;
  }

  switch (trigger.type) {
    case 'ATTRIBUTE_CHECK':
      return `进行 ${getAttributeLabel(trigger.attribute)} ${trigger.difficulty || '?'}+ 检定。`;
    case 'DRAW_CARD': {
      const reveal = getTileRevealPresentation(trigger.deck);
      const label = reveal ? reveal.label : '卡牌';
      const count = trigger.count || 1;
      return `立即抽取 ${count} 张${label}。`;
    }
    case 'RANDOM_EVENT':
      return '从多种结果中随机结算一种。';
    default:
      if ((trigger as TileTrigger & { effects?: Effect[] }).effects?.length) {
        return (trigger as TileTrigger & { effects?: Effect[] }).effects!
          .map(renderTileEffectText)
          .join('；');
      }
      return '结算该房间的触发效果。';
  }
};

export const getTileHintEntries = (tileDef: TileDef): TileHintEntry[] => {
  const entries: TileHintEntry[] = [];
  const reveal = getTileRevealPresentation(tileDef.cardSymbol);

  if (reveal) {
    entries.push({
      key: `reveal-${tileDef.cardSymbol}`,
      kind: 'reveal',
      label: reveal.label,
      text: reveal.description,
      summaryText: reveal.summaryText,
      icon: reveal.icon,
      colorClassName: reveal.accentClassName,
      containerClassName: reveal.panelClassName,
      bodyClassName: 'text-zinc-300/80',
      type: reveal.type,
    });
  }

  if (tileDef.onEnter) {
    const text = getTileTriggerText(tileDef.onEnter);
    entries.push({
      key: `enter-${tileDef.id}`,
      kind: 'trigger',
      label: TRIGGER_STYLES.enter.label,
      text,
      summaryText: summarize('进入', text),
      icon: TRIGGER_STYLES.enter.icon,
      colorClassName: TRIGGER_STYLES.enter.colorClassName,
      containerClassName: TRIGGER_STYLES.enter.containerClassName,
      bodyClassName: TRIGGER_STYLES.enter.bodyClassName,
      type: TRIGGER_STYLES.enter.type,
      repeatable: TRIGGER_STYLES.enter.repeatable,
    });
  }

  if (tileDef.onLeave) {
    const text = getTileTriggerText(tileDef.onLeave);
    entries.push({
      key: `leave-${tileDef.id}`,
      kind: 'trigger',
      label: TRIGGER_STYLES.leave.label,
      text,
      summaryText: summarize('离开', text),
      icon: TRIGGER_STYLES.leave.icon,
      colorClassName: TRIGGER_STYLES.leave.colorClassName,
      containerClassName: TRIGGER_STYLES.leave.containerClassName,
      bodyClassName: TRIGGER_STYLES.leave.bodyClassName,
      type: TRIGGER_STYLES.leave.type,
      repeatable: TRIGGER_STYLES.leave.repeatable,
    });
  }

  if (tileDef.onEnterEffects?.length) {
    const effectTexts = tileDef.onEnterEffects.map(renderTileEffectText);
    const text = effectTexts.join('；');
    entries.push({
      key: `legacy-enter-${tileDef.id}`,
      kind: 'effect',
      label: TRIGGER_STYLES.legacyEnter.label,
      text,
      summaryText: summarize('进入', effectTexts[0] || '结算房间效果'),
      icon: TRIGGER_STYLES.legacyEnter.icon,
      colorClassName: TRIGGER_STYLES.legacyEnter.colorClassName,
      containerClassName: TRIGGER_STYLES.legacyEnter.containerClassName,
      bodyClassName: TRIGGER_STYLES.legacyEnter.bodyClassName,
      type: TRIGGER_STYLES.legacyEnter.type,
      repeatable: TRIGGER_STYLES.legacyEnter.repeatable,
    });
  }

  tileDef.effects?.forEach((effect, index) => {
    const tone = effect.type === 'buff' || effect.type === 'debuff' || effect.type === 'item'
      ? effect.type
      : TRIGGER_STYLES.staticEffect.type;
    const colorClassName =
      tone === 'buff'
        ? 'text-emerald-400'
        : tone === 'debuff'
          ? 'text-red-400'
          : tone === 'item'
            ? 'text-indigo-400'
            : TRIGGER_STYLES.staticEffect.colorClassName;
    const containerClassName =
      tone === 'buff'
        ? 'bg-emerald-900/10 border-emerald-900/30'
        : tone === 'debuff'
          ? 'bg-red-900/10 border-red-900/30'
          : tone === 'item'
            ? 'bg-indigo-900/10 border-indigo-900/30'
            : TRIGGER_STYLES.staticEffect.containerClassName;
    const bodyClassName =
      tone === 'buff'
        ? 'text-emerald-300/80'
        : tone === 'debuff'
          ? 'text-red-300/80'
          : tone === 'item'
            ? 'text-indigo-300/80'
            : TRIGGER_STYLES.staticEffect.bodyClassName;

    entries.push({
      key: `effect-${tileDef.id}-${index}`,
      kind: 'effect',
      label: TRIGGER_STYLES.staticEffect.label,
      text: effect.text,
      summaryText: effect.text,
      icon: TRIGGER_STYLES.staticEffect.icon,
      colorClassName,
      containerClassName,
      bodyClassName,
      type: tone,
    });
  });

  return entries;
};