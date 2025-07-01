
/**
 * @fileOverview Contains the core business logic for the Quest module.
 */

import type { GameState, Quest } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function handleAddQuest(state: GameState, questData: Omit<Quest, 'id' | 'dateAdded'>): GameState {
    if (!state.player) return state;

    const nowISO = new Date().toISOString();
    const newQuest: Quest = {
        ...questData,
        id: uuidv4(),
        dateAdded: nowISO,
        status: questData.status || 'active', // Default to 'active' if not provided
        objectives: questData.objectives.map(obj => ({ ...obj, id: uuidv4() }))
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
