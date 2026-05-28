import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FiltersState {
  searchQuery: string;
  categoryFilter: string;
  startDate: string;
  endDate: string;
  showDateFilter: boolean;
  month: number | "ALL";
  year: number | "ALL";
  expensesOnly: boolean;
  incomeOnly: boolean;
}

const initialState: FiltersState = {
  searchQuery: "",
  categoryFilter: "ALL",
  startDate: "",
  endDate: "",
  showDateFilter: false,
  month: "ALL",
  year: "ALL",
  expensesOnly: false,
  incomeOnly: false,
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
    setExpensesOnly(state, action: PayloadAction<boolean>) {
      state.expensesOnly = action.payload;
    },
    setIncomeOnly(state, action: PayloadAction<boolean>) {
      state.incomeOnly = action.payload;
    },
    clearFilters(state) {
      state.searchQuery = "";
      state.categoryFilter = "ALL";
      state.startDate = "";
      state.endDate = "";
      state.month = "ALL";
      state.year = "ALL";
      state.expensesOnly = false;
      state.incomeOnly = false;
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
  setExpensesOnly,
  setIncomeOnly,
  clearFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;
