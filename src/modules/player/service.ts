/**
 * @fileOverview Service layer for the Player module.
 * Handles interactions with external services like Firestore for player data.
 */
import type { Player } from './types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const CHARACTERS_SUBCOLLECTION = 'characters';

export async function fetchPlayer(uid: string, characterId: string): Promise<Player | null> {
    if (!db) {
        console.error("Firestore not available.");
        return null;
    }
    const playerDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
    const docSnap = await getDoc(playerDocRef);

    if (docSnap.exists()) {
        // TODO: Hydrate and validate data
        return docSnap.data() as Player;
    }
    return null;
}

export async function savePlayer(uid: string, characterId: string, player: Player): Promise<void> {
    if (!db) {
        throw new Error("Firestore not available.");
    }
    const playerDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
    // TODO: Clean data before saving
    await setDoc(playerDocRef, player, { merge: true });
}
