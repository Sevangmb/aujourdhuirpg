
/**
 * @fileOverview Contains the core business logic for the Quest module.
 */

import type { GameState, Quest, Player } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateJobReward } from '@/modules/economy/logic';

export function handleAddQuest(state: GameState, questData: Omit<Quest, 'id' | 'dateAdded'>): GameState {
    if (!state.player) return state;

    const mutableQuestData = { ...questData };
    
    // If the quest is a job, calculate the reward based on player skills, overriding any AI suggestion.
    if (mutableQuestData.type === 'job' && state.player.skills) {
        const moneyReward = calculateJobReward(state.player.skills, mutableQuestData);
        if (!mutableQuestData.rewards) {
            mutableQuestData.rewards = {};
        }
        mutableQuestData.rewards.money = moneyReward;
    }

    const nowISO = new Date().toISOString();
    const newQuest: Quest = {
        ...mutableQuestData,
        id: uuidv4(),
        dateAdded: nowISO,
        status: mutableQuestData.status || 'active', // Default to 'active' if not provided
        objectives: mutableQuestData.objectives.map(obj => ({ ...obj, id: obj.id || uuidv4() }))
    };

    const newQuestLog = [...(state.player.questLog || []), newQuest];
    return { ...state, player: { ...state.player, questLog: newQuestLog } };
}

export function handleQuestStatusChange(state: GameState, questId: string, newStatus: Quest['status']): GameState {
    if (!state.player) return state;

    const nowISO = new Date().toISOString();
    const newQuestLog = state.player.questLog.map(q =>
        q.id === questId ? { ...q, status: newStatus, dateCompleted: ['completed', 'failed'].includes(newStatus) ? nowISO : q.dateCompleted } : q
    );

    return { ...state, player: { ...state.player, questLog: newQuestLog } };
}

export function handleQuestObjectiveChange(state: GameState, questId: string, objectiveId: string, completed: boolean): GameState {
    if (!state.player) return state;

    const newQuestLog = state.player.questLog.map(q => {
        if (q.id === questId) {
            const newObjectives = q.objectives.map(o =>
                o.id === objectiveId ? { ...o, isCompleted: completed } : o
            );
            return { ...q, objectives: newObjectives };
        }
        return q;
    });

    return { ...state, player: { ...state.player, questLog: newQuestLog } };
}

    