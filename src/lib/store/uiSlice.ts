import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UIState = {
  toast?: { type: "success" | "error"; message: string } | null;
};

const initialState: UIState = { toast: null };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showToast(state, action: PayloadAction<UIState["toast"]>) {
      state.toast = action.payload;
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
