import { SkillTreeCategory } from '../../../../types';
import skillTreesData from './skillTrees.json';

// 从 JSON 加载技能树数据
export const SKILL_TREES: SkillTreeCategory[] = Object.values(skillTreesData) as SkillTreeCategory[];