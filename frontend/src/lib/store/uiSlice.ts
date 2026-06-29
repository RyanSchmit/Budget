import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  activeTab: "transactions" | "keywords" | "accrued";
}

const initialState: UiState = {
  activeTab: "transactions",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveTab(
      state,
      action: PayloadAction<"transactions" | "keywords" | "accrued">,
    ) {
      state.activeTab = action.payload;
    },
  },
});

export const { setActiveTab } = uiSlice.actions;

export default uiSlice.reducer;
