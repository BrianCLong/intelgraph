import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CodexCard = {
  id: string;
  type: 'entity' | 'note' | 'snapshot';
  entityId?: string;
  title: string;
  text?: string;
  media?: { kind: 'image'; dataUrl: string };
  provenance: {
    sourceId: string;
    queryHash?: string;
    capturedAt: string;
    link: string;
  };
  redaction?: { fields: string[]; reason: string } | null;
};

export type CodexSection = { id: string; title: string; cardIds: string[] };

export interface CodexState {
  sectionOrder: string[];
  sections: Record<string, CodexSection>;
  cards: Record<string, CodexCard>;
  collaborators: Record<
    string,
    {
      name: string;
      color: string;
      selection?: { sectionId: string; cardId?: string };
    }
  >;
  saving: boolean;
  lastSavedAt?: string;
}

const initialState: CodexState = {
  sectionOrder: [],
  sections: {},
  cards: {},
  collaborators: {},
  saving: false,
};

const slice = createSlice({
  name: 'codex',
  initialState,
  reducers: {
    addSection(state, action: PayloadAction<string>) {
      const id = Date.now().toString();
      state.sectionOrder.push(id);
      state.sections[id] = { id, title: action.payload, cardIds: [] };
    },
    addCard(state, action: PayloadAction<{ sectionId: string; card: CodexCard }>) {
      const { sectionId, card } = action.payload;
      state.cards[card.id] = card;
      state.sections[sectionId]?.cardIds.push(card.id);
    },
    moveCard(
      state,
      action: PayloadAction<{
        from: { sectionId: string; index: number };
        to: { sectionId: string; index: number };
      }>,
    ) {
      const { from, to } = action.payload;
      const fromIds = state.sections[from.sectionId].cardIds;
      const [moved] = fromIds.splice(from.index, 1);
      const toIds = state.sections[to.sectionId].cardIds;
      toIds.splice(to.index, 0, moved);
    },
    setRedaction(
      state,
      action: PayloadAction<{ cardId: string; fields: string[]; reason: string }>,
    ) {
      const { cardId, fields, reason } = action.payload;
      const card = state.cards[cardId];
      if (card) {
        card.redaction = { fields, reason };
      }
    },
  },
});

export const { addSection, addCard, moveCard, setRedaction } = slice.actions;
export default slice.reducer;
export const selectCodex = (state: any) => state.codex;
