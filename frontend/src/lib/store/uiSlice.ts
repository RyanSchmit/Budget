import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  activeTab: "transactions" | "keywords";
}

const initialState: UiState = {
  activeTab: "transactions",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<"transactions" | "keywords">) {
      state.activeTab = action.payload;
    },
  },
});

export const { setActiveTab } = uiSlice.actions;

export default uiSlice.reducer;
