import { Facet } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { sendableUpdates, getSyncedVersion } from '@codemirror/collab';
import { CollabUpdateJSON } from '../../types/collab.types.js';

export interface CollabSyncConfig {
  onPush: (file: string, version: number, updates: CollabUpdateJSON[]) => void;
  isRemoteChange: () => boolean;
  getClientId: () => string;
  getActiveFile: () => string;
}

export const collabSyncFacet = Facet.define<CollabSyncConfig, CollabSyncConfig | null>({
  combine(values) {
    return values[values.length - 1] || null;
  },
});

class CollabPushPlugin {
  private pushing = false;
  constructor(private view: EditorView) {}

  update(update: ViewUpdate) {
    const config = this.view.state.facet(collabSyncFacet);
    if (!config) return;
    if (update.docChanged && !config.isRemoteChange()) {
      this.push(config);
    }
  }

  push(config: CollabSyncConfig) {
    if (this.pushing) return;
    const updates = sendableUpdates(this.view.state);
    if (!updates.length) return;

    this.pushing = true;
    const ver = getSyncedVersion(this.view.state);
    const jsonUpdates: CollabUpdateJSON[] = updates.map((u) => ({
      clientID: config.getClientId() || 'anon',
      changes: u.changes.toJSON(),
    }));

    config.onPush(config.getActiveFile(), ver, jsonUpdates);
    this.pushing = false;
  }
}

export const collabPushPlugin = ViewPlugin.fromClass(CollabPushPlugin);
