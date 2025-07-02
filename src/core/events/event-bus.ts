/**
 * @fileOverview A simple, singleton event bus for inter-module communication.
 * This allows different parts of the game logic (e.g., combat, economy) to react to events
 * without being tightly coupled.
 */

type Listener<T> = (event: T) => void;

class EventBus {
  private listeners: { [key: string]: Listener<any>[] } = {};

  /**
   * Subscribes a listener to a specific event type.
   * @param eventType The name of the event to listen for (e.g., 'game:combat').
   * @param listener The callback function to execute when the event is dispatched.
   */
  on<T>(eventType: string, listener: Listener<T>): void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
  }

  /**
   * Unsubscribes a listener from a specific event type.
   * @param eventType The name of the event.
   * @param listener The exact listener function to remove.
   */
  off<T>(eventType: string, listener: Listener<T>): void {
    if (!this.listeners[eventType]) {
      return;
    }
    this.listeners[eventType] = this.listeners[eventType].filter(l => l !== listener);
  }

  /**
   * Dispatches an event, calling all subscribed listeners with the event payload.
   * @param eventType The name of the event to dispatch.
   * @param event The data payload for the event.
   */
  dispatch<T>(eventType: string, event: T): void {
    if (!this.listeners[eventType]) {
      return;
    }
    this.listeners[eventType].forEach(listener => {
        try {
            listener(event);
        } catch (error) {
            console.error(`Error in event listener for [${eventType}]:`, error);
        }
    });
  }
}

// Export a singleton instance to be used throughout the application.
export const eventBus = new EventBus();
