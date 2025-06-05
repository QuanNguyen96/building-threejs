// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import modelThreejsReducer from './modelThreejs';

const store = configureStore({
  reducer: {
    modelThreejs: modelThreejsReducer,
  },
});

export default store;
