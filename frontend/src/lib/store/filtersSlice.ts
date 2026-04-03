import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FiltersState {
  searchQuery: string;
  categoryFilter: string;
  startDate: string;
  endDate: string;
  showDateFilter: boolean;
  month: number | "ALL";
  year: number | "ALL";
}

const initialState: FiltersState = {
  searchQuery: "",
  categoryFilter: "ALL",
  startDate: "",
  endDate: "",
  showDateFilter: false,
  month: "ALL",
  year: "ALL",
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<string>) {
      state.categoryFilter = action.payload;
    },
    setStartDate(state, action: PayloadAction<string>) {
      state.startDate = action.payload;
    },
    setEndDate(state, action: PayloadAction<string>) {
      state.endDate = action.payload;
    },
    setShowDateFilter(state, action: PayloadAction<boolean>) {
      state.showDateFilter = action.payload;
    },
    setMonth(state, action: PayloadAction<number | "ALL">) {
      state.month = action.payload;
    },
    setYear(state, action: PayloadAction<number | "ALL">) {
      state.year = action.payload;
    },
    clearFilters(state) {
      state.searchQuery = "";
      state.categoryFilter = "ALL";
      state.startDate = "";
      state.endDate = "";
      state.month = "ALL";
      state.year = "ALL";
    },
  },
});

export const {
  setSearchQuery,
  setCategoryFilter,
  setStartDate,
  setEndDate,
  setShowDateFilter,
  setMonth,
  setYear,
  clearFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;
