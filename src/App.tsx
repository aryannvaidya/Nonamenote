import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainApp from './MainApp';
import NoteViewer from './NoteViewer';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/note-viewer/:id" element={<NoteViewer />} />
    </Routes>
  );
}
