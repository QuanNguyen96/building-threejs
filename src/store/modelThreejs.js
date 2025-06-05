// store/modelThreejs.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  models: {},          // lưu các model Three.js, key là tên model
  selectedModel: null, // tên model đang chọn
  count: 11,
};

const modelThreejsSlice = createSlice({
  name: 'modelThreejs',
  initialState,
  reducers: {
    SET_MODEL(state, action) {
      const { model, category } = action.payload;
      if (!category || !model) return;
      if (!state.models[category]) {
        state.models[category]={}
      }
      state.models[category][model.uuid]=model
    },
    removeModel(state, action) {
      delete state.models[action.payload];
    },
    setSelectedModel(state, action) {
      state.selectedModel = action.payload;
    },
    UPDATE_COUNT(state, count) {
      state.count++;
    },
    SET_COUNT(state, payload) {
      const data = payload.payload;
      state.count = data[1];
    }
  },
});

// export const { setModel, removeModel, setSelectedModel } = modelThreejsSlice.actions;
export const modelThreejsActions = modelThreejsSlice.actions;

export default modelThreejsSlice.reducer;
