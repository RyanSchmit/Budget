import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getUserProfile, AiPreferences } from "@/lib/api/user";

interface PreferencesState {
  preferences: AiPreferences | null;
  status: "idle" | "loading" | "loaded" | "error";
}

const initialState: PreferencesState = {
  preferences: null,
  status: "idle",
};

export const loadPreferences = createAsyncThunk(
  "preferences/load",
  async () => {
    const { preferences } = await getUserProfile();
    return preferences;
  },
);

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setPreferences(state, action: PayloadAction<AiPreferences>) {
      state.preferences = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPreferences.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
        state.status = "loaded";
      })
      .addCase(loadPreferences.rejected, (state) => {
        state.status = "error";
      });
  },
});

export const { setPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
