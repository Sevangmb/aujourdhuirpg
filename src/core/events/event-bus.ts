/**
 * @fileOverview A simple, centralized event bus for inter-module communication.
 * This allows modules to be decoupled from each other.
 */

type EventHandler = (payload: any) => void;

class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribes to an event.
   * @param eventName The name of the event to listen for.
   * @param handler The function to call when the event is dispatched.
   * @returns A function to unsubscribe.
   */
  on(eventName: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(handler);

    // Return an unsubscribe function
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Unsubscribes from an event.
   * @param eventName The name of the event.
   * @param handler The handler to remove.
   */
  off(eventName: string, handler: EventHandler): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const index = eventListeners.indexOf(handler);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Dispatches an event to all subscribed listeners.
   * @param eventName The name of the event to dispatch.
   * @param payload The data to send with the event.
   */
  dispatch(eventName: string, payload: any): void {
    console.log(`[EventBus] Dispatching event: ${eventName}`, payload);
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for "${eventName}":`, error);
        }
      });
    }
  }
}

// Export a singleton instance of the event bus
export const eventBus = new EventBus();
